import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Linkedin, Github, GraduationCap, Briefcase, Award, Trophy, Download, Code, Network } from "lucide-react";
import { siteConfig } from "@/config/site";
import { prisma } from "@/lib/prisma";

// 啟用動態渲染並設置重新驗證時間（30秒）
export const revalidate = 30;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Me",
  description:
    "Learn more about Benedict Tiong - Master's student in Computer Science at NYCU, specializing in Network Architecture, Cloud Native Technologies, and Full Stack Development.",
  openGraph: {
    title: "About Me",
    description:
      "Learn more about Benedict Tiong - Master's student in Computer Science at NYCU, specializing in Network Architecture, Cloud Native Technologies, and Full Stack Development.",
    url: `${siteConfig.url}/about`,
    images: [siteConfig.ogImage],
  },
};

interface SchoolLogo {
  school: string;
  logo: string;
}

interface ProjectImage {
  project: string;
  image: string;
}

interface CompanyLogo {
  company: string;
  logo: string;
}

async function getAboutConfig() {
  try {
    let config = await prisma.aboutConfig.findFirst();
    if (!config) {
      return {
        profileImage: null,
        schoolLogos: [] as SchoolLogo[],
        projectImages: [] as ProjectImage[],
        companyLogos: [] as CompanyLogo[],
      };
    }
    return {
      profileImage: config.profileImage,
      schoolLogos: config.schoolLogos ? (JSON.parse(config.schoolLogos) as SchoolLogo[]) : [],
      projectImages: config.projectImages ? (JSON.parse(config.projectImages) as ProjectImage[]) : [],
      companyLogos: config.companyLogos ? (JSON.parse(config.companyLogos) as CompanyLogo[]) : [],
    };
  } catch (error) {
    console.error("Error loading about config:", error);
    return {
      profileImage: null,
      schoolLogos: [] as SchoolLogo[],
      projectImages: [] as ProjectImage[],
      companyLogos: [] as CompanyLogo[],
    };
  }
}

function getSchoolLogo(schoolLogos: SchoolLogo[], schoolName: string): string | null {
  if (!schoolLogos || schoolLogos.length === 0) return null;
  
  // 更靈活的匹配邏輯
  const normalizedSchoolName = schoolName.toLowerCase().trim();
  const logo = schoolLogos.find((l) => {
    const normalizedLogoName = l.school.toLowerCase().trim();
    // 完全匹配
    if (normalizedLogoName === normalizedSchoolName) return true;
    // 包含匹配
    if (normalizedSchoolName.includes(normalizedLogoName) || normalizedLogoName.includes(normalizedSchoolName)) return true;
    // 特殊匹配：NYCU, NYCU Taiwan, National Yang Ming Chiao Tung University
    if ((normalizedSchoolName.includes("nycu") || normalizedSchoolName.includes("yang ming")) && 
        (normalizedLogoName.includes("nycu") || normalizedLogoName.includes("yang ming"))) return true;
    // 特殊匹配：NTUT, NTUT Taiwan, National Taipei University of Technology
    if ((normalizedSchoolName.includes("ntut") || normalizedSchoolName.includes("taipei tech")) && 
        (normalizedLogoName.includes("ntut") || normalizedLogoName.includes("taipei tech"))) return true;
    return false;
  });
  return logo?.logo || null;
}

function getProjectImage(projectImages: ProjectImage[], projectName: string): string | null {
  if (!projectImages || projectImages.length === 0) return null;
  
  // 更靈活的匹配邏輯
  const normalizedProjectName = projectName.toLowerCase().trim();
  const image = projectImages.find((p) => {
    const normalizedImageName = p.project.toLowerCase().trim();
    // 完全匹配
    if (normalizedImageName === normalizedProjectName) return true;
    // 包含匹配
    if (normalizedProjectName.includes(normalizedImageName) || normalizedImageName.includes(normalizedProjectName)) return true;
    // 關鍵字匹配：CI/CD, Kubernetes
    if ((normalizedProjectName.includes("ci/cd") || normalizedProjectName.includes("cicd") || normalizedProjectName.includes("zero downtime")) && 
        (normalizedImageName.includes("ci/cd") || normalizedImageName.includes("cicd") || normalizedImageName.includes("zero downtime"))) return true;
    if ((normalizedProjectName.includes("kubernetes") || normalizedProjectName.includes("k8s") || normalizedProjectName.includes("multi-cluster")) && 
        (normalizedImageName.includes("kubernetes") || normalizedImageName.includes("k8s") || normalizedImageName.includes("multi-cluster"))) return true;
    return false;
  });
  return image?.image || null;
}

function getCompanyLogo(companyLogos: CompanyLogo[], companyName: string): string | null {
  if (!companyLogos || companyLogos.length === 0) return null;
  
  // 更靈活的匹配邏輯
  const normalizedCompanyName = companyName.toLowerCase().trim();
  const logo = companyLogos.find((c) => {
    const normalizedLogoName = c.company.toLowerCase().trim();
    // 完全匹配
    if (normalizedLogoName === normalizedCompanyName) return true;
    // 包含匹配
    if (normalizedCompanyName.includes(normalizedLogoName) || normalizedLogoName.includes(normalizedCompanyName)) return true;
    // 特殊匹配：NYCU, Makalot, Iscom, MUST, NTUT
    if ((normalizedCompanyName.includes("nycu") || normalizedCompanyName.includes("yang ming")) && 
        (normalizedLogoName.includes("nycu") || normalizedLogoName.includes("yang ming"))) return true;
    if ((normalizedCompanyName.includes("makalot")) && normalizedLogoName.includes("makalot")) return true;
    if ((normalizedCompanyName.includes("iscom")) && normalizedLogoName.includes("iscom")) return true;
    if ((normalizedCompanyName.includes("must")) && normalizedLogoName.includes("must")) return true;
    if ((normalizedCompanyName.includes("ntut") || normalizedCompanyName.includes("taipei tech")) && 
        (normalizedLogoName.includes("ntut") || normalizedLogoName.includes("taipei tech"))) return true;
    return false;
  });
  return logo?.logo || null;
}

export default async function AboutPage() {
  const config = await getAboutConfig();
  const { profileImage, schoolLogos, projectImages, companyLogos } = config;

  // 調試：輸出配置信息（僅在開發環境）
  if (process.env.NODE_ENV === "development") {
    console.log("About page config:", {
      profileImage,
      schoolLogosCount: schoolLogos?.length || 0,
      projectImagesCount: projectImages?.length || 0,
      schoolLogos,
      projectImages,
    });
  }

  // 調試：輸出所有可用的 logo 和圖片
  if (process.env.NODE_ENV === "development") {
    console.log("Available school logos:", schoolLogos);
    console.log("Available project images:", projectImages);
  }

  // 嘗試匹配，優先使用匹配的，否則使用第一個可用的
  // NYCU Logo - 優先匹配包含 "NYCU" 或 "Yang Ming" 的
  let nycuLogo: string | null = null;
  if (schoolLogos && schoolLogos.length > 0) {
    nycuLogo = getSchoolLogo(schoolLogos, "NYCU") || 
               getSchoolLogo(schoolLogos, "National Yang Ming Chiao Tung University") ||
               getSchoolLogo(schoolLogos, "Yang Ming");
    // 如果沒有匹配到，使用第一個
    if (!nycuLogo) {
      nycuLogo = schoolLogos[0].logo;
    }
  }
  
  // NTUT Logo - 優先匹配包含 "NTUT" 或 "Taipei Tech" 的
  let ntutLogo: string | null = null;
  if (schoolLogos && schoolLogos.length > 0) {
    // 先找到所有可能的 NTUT logo
    const possibleNtutLogos = schoolLogos.filter(l => {
      const name = l.school.toLowerCase();
      return name.includes("ntut") || name.includes("taipei tech") || name.includes("taipei university");
    });
    if (possibleNtutLogos.length > 0) {
      ntutLogo = possibleNtutLogos[0].logo;
    } else if (schoolLogos.length > 1 && schoolLogos[1].logo !== nycuLogo) {
      // 使用第二個，且不是 NYCU 的
      ntutLogo = schoolLogos[1].logo;
    } else if (schoolLogos.length > 0 && schoolLogos[0].logo !== nycuLogo) {
      // 如果只有一個且不是 NYCU，也使用它
      ntutLogo = schoolLogos[0].logo;
    }
  }
  
  // Project 1 - CI/CD Framework
  let project1Image: string | null = null;
  if (projectImages && projectImages.length > 0) {
    project1Image = getProjectImage(projectImages, "CI/CD Framework") ||
                    getProjectImage(projectImages, "Zero Downtime") ||
                    getProjectImage(projectImages, "CI/CD") ||
                    getProjectImage(projectImages, "cicd");
    // 如果沒有匹配到，使用第一個
    if (!project1Image) {
      project1Image = projectImages[0].image;
    }
  }
  
  // Project 2 - Kubernetes
  let project2Image: string | null = null;
  if (projectImages && projectImages.length > 0) {
    // 先找到所有可能的 Kubernetes 圖片
    const possibleK8sImages = projectImages.filter(p => {
      const name = p.project.toLowerCase();
      return name.includes("kubernetes") || name.includes("k8s") || name.includes("multi-cluster") || name.includes("cluster");
    });
    if (possibleK8sImages.length > 0) {
      project2Image = possibleK8sImages[0].image;
    } else if (projectImages.length > 1 && projectImages[1].image !== project1Image) {
      // 使用第二個，且不是 project1 的
      project2Image = projectImages[1].image;
    } else if (projectImages.length > 0 && projectImages[0].image !== project1Image) {
      // 如果只有一個且不是 project1，也使用它
      project2Image = projectImages[0].image;
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="space-y-8">
        {/* Profile Header */}
        <Card className="shadow-lg">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              {profileImage ? (
                <div className="mb-6 inline-block">
                  <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-slate-200 shadow-md mx-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profileImage}
                      alt="Benedict Tiong"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-6 inline-flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-5xl font-bold text-white shadow-md">
                  B
                </div>
              )}
              <h1 className="mb-2 text-4xl font-bold text-slate-900">
                Benedict Ing Ngie Tiong
              </h1>
              <p className="mb-2 text-lg text-slate-600">
                Master&apos;s Student in Computer Science | Full Stack Developer
              </p>
              <div className="mb-6 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600">
                <span>📞 (+886) 905-754-546</span>
                <span>✉️ benedict.cs12@nycu.edu.tw</span>
                <Link 
                  href="https://www.linkedin.com/in/benedict-tiong" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-slate-900 transition-colors"
                >
                  🔗 benedict-tiong
                </Link>
              </div>
              <div className="flex justify-center gap-3">
                <Link href="/cv.pdf" download="Benedict_Tiong_CV.pdf">
                  <Button variant="default" className="gap-2 shadow-md">
                    <Download className="h-4 w-4" />
                    Download CV (PDF)
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Education */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <GraduationCap className="h-5 w-5" />
              Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4 relative">
                <div className="flex items-start gap-4">
                  {nycuLogo && (
                    <div className="relative h-16 w-16 flex-shrink-0 mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={nycuLogo}
                        alt="NYCU Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-slate-900 text-lg flex-1">
                        M.S. in Computer Science
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Sep 2023 - Jan 2026
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-2">
                      National Yang Ming Chiao Tung University (NYCU), Taiwan
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• <strong>Thesis:</strong> A CI/CD Framework for Zero Downtime Deployment in Wi‑Fi Mesh Networks</li>
                      <li>• <strong>Research Focus:</strong> Network Function Virtualization (NFV), CI/CD, DevOps, Kubernetes, and Cloud‑Native Technologies</li>
                      <li>• <strong>Advisor:</strong> Prof. Chien‑Chao Tseng (Wireless Internet Laboratory, WinLab)</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="border-l-4 border-green-500 pl-4 relative">
                <div className="flex items-start gap-4">
                  {ntutLogo && (
                    <div className="relative h-16 w-16 flex-shrink-0 mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ntutLogo}
                        alt="NTUT Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-slate-900 text-lg flex-1">
                        B.S. in Interaction Design (Media Design Division)
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Sep 2019 - Jun 2023
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-2">
                      National Taipei University of Technology (NTUT), Taiwan
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• <strong>Award:</strong> Outstanding Overseas Chinese Graduate of the Year, Presidential Award (3 Semesters)</li>
                      <li>• <strong>Graduation Project:</strong> A Location‑Based AR System for Urban Exploration and Infrastructure Maintenance</li>
                      <li>• <strong>Research Focus:</strong> IoT, Embedded Systems, Full‑Stack Development, AR/VR, Human‑Computer Interaction (HCI)</li>
                      <li>• <strong>Advisor:</strong> Prof. Lydia Hsiao‑Mei Lin</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Code className="h-5 w-5" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="border-l-4 border-purple-500 pl-4 relative">
                <div className="flex flex-col md:flex-row gap-4">
                  {project1Image && (
                    <div className="relative w-full md:w-64 h-48 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project1Image}
                        alt="CI/CD Framework Project"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-slate-900 text-lg flex-1">
                        A CI/CD Framework for Zero Downtime Deployment in Wi‑Fi Mesh Networks
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Feb 2025 - Jan 2026
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-2">
                      Master&apos;s Thesis / Industry‑Academia Collaboration with Wistron NeWeb Corporation (WNC)
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• Integrated GitHub Actions with USP APIs to automate cloud‑to‑edge container delivery to Root AP via TR‑369 (USP) standards</li>
                      <li>• Developed a C‑based Controller bridging USP Agent (via UDS) to Extender APs (via TCP) for synchronized mesh updates</li>
                      <li>• Engineered Linux iptables steering to achieve zero packet loss and zero downtime during Blue‑Green/Canary deployments</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="border-l-4 border-orange-500 pl-4 relative">
                <div className="flex flex-col md:flex-row gap-4">
                  {project2Image && (
                    <div className="relative w-full md:w-64 h-48 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project2Image}
                        alt="Kubernetes Multi-Cluster Project"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-slate-900 text-lg flex-1">
                        Kubernetes‑based Multi‑Cluster Hybrid Cloud Management System
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Apr 2024 - Sep 2024
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-2">
                      Industry‑Academia Collaboration with Iscom Online International Info. Inc.
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• Orchestrated public cloud and on‑premises clusters using Karmada and GitOps (ArgoCD/FluxCD) for automated service propagation</li>
                      <li>• Implemented Cilium Cluster Mesh and HAProxy to enable global traffic steering, cross‑cluster failover, and firewall security policies</li>
                      <li>• Engineered a unified observability stack integrating Thanos, Prometheus, and Grafana for centralized health monitoring</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Briefcase className="h-5 w-5" />
              Work Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="border-l-2 border-slate-300 pl-4">
                <div className="flex items-start gap-4">
                  {getCompanyLogo(companyLogos, "NYCU") && (
                    <div className="relative h-12 w-12 flex-shrink-0 mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCompanyLogo(companyLogos, "NYCU") || ""}
                        alt="NYCU Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-slate-900 flex-1">
                        SDN/NFV Teaching Assistant
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Jul 2023 - Jan 2024
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      Department of Computer Science, NYCU
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• Refined labs for ONOS SDN modules to implement L2/L3 protocols, including Learning Bridge, Proxy ARP, and Unicast DHCP</li>
                      <li>• Led NFV labs on Docker‑based routing (BGP) and guided final projects on VLAN‑based Segment Routing</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="border-l-2 border-slate-300 pl-4">
                <div className="flex items-start gap-4">
                  {getCompanyLogo(companyLogos, "Makalot") && (
                    <div className="relative h-12 w-12 flex-shrink-0 mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCompanyLogo(companyLogos, "Makalot") || ""}
                        alt="Makalot Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-slate-900 flex-1">
                        Software Engineer Intern
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Jul 2022 - Jun 2023
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      IT Department, Makalot Industrial Co., Ltd.
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• Developed a Full‑Stack dashboard using Vue.js and ASP.NET Web API to streamline RBAC and system configurations</li>
                      <li>• Engineered a Dockerized OAuth 2.0 Authentication Service with JWT and Dapper ORM to secure cross‑platform ERP API access</li>
                      <li>• Implemented RPA workflows via Power Automate to trigger Microsoft Teams and Outlook alerts, reducing manual effort</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="border-l-2 border-slate-300 pl-4">
                <div className="flex items-start gap-4">
                  {getCompanyLogo(companyLogos, "MUST") && (
                    <div className="relative h-12 w-12 flex-shrink-0 mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCompanyLogo(companyLogos, "MUST") || ""}
                        alt="MUST Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-slate-900 flex-1">
                        Unity Software Engineer (Research Assistant)
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Jan 2022 - Jun 2022
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      Department of Multimedia & Game Development, MUST
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• Developed an NSTC project using Unity and C#, engineering a cross‑platform system featuring 5 distinct motion‑sensing games</li>
                      <li>• Integrated Google Firebase for real‑time data synchronization to support bilingual (English/Chinese) content and learning analysis</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="border-l-2 border-slate-300 pl-4">
                <div className="flex items-start gap-4">
                  {getCompanyLogo(companyLogos, "NTUT") && (
                    <div className="relative h-12 w-12 flex-shrink-0 mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCompanyLogo(companyLogos, "NTUT") || ""}
                        alt="NTUT Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-slate-900 flex-1">
                        IT Support (Work‑Study)
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Jun 2021 - Jun 2023
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      Computer and Network Center, NTUT
                    </p>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li>• Provided technical support to faculty members, handling PC assembly, OS installation, and troubleshooting campus network issues</li>
                      <li>• Participated in the frontend development of the campus Authorized Software Portal, improving the UI/UX to streamline software downloads</li>
                      <li>• Maintained lab servers and network infrastructure</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Network className="h-5 w-5" />
              Technical Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                  Cloud Native & K8s
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["Kubernetes (K8s)", "Docker", "Helm", "Cilium (Service Mesh)", "Karmada", "Harbor", "Linux Containers (LXC)"].map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                  CI/CD & GitOps
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["Jenkins", "GitLab CI/CD", "GitHub Actions", "ArgoCD", "Flux CD", "GitOps Workflow", "Git"].map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                  Observability
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["Prometheus", "Grafana", "Thanos", "Monitoring & Logging"].map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                  Infrastructure & Networking
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["Google Cloud Platform (GCP)", "Proxmox VE", "Ansible", "Linux Networking", "SSL/TLS Management"].map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Trophy className="h-5 w-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Award className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    National Makerthon: Good Health and Well‑Being - 1st Place
                  </p>
                  <p className="text-xs text-slate-500">Ministry of Education 2022</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Vision Get Wild XR Social Welfare Potential Award
                  </p>
                  <p className="text-xs text-slate-500">Meta XR Hub Taiwan 2023</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Intel® DevCup x OpenVINO™ Toolkit Competition - Shortlisted
                  </p>
                  <p className="text-xs text-slate-500">Intel Corporation 2021</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    5G Mobileheroes - Shortlisted
                  </p>
                  <p className="text-xs text-slate-500">Industrial Development Administration 2021</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-900">Let&apos;s Connect</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-slate-700">
              I&apos;m always open to discussing new opportunities, collaborations, or just having 
              a conversation about technology. Feel free to reach out!
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="mailto:benedict.cs12@nycu.edu.tw">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
              </Link>
              <Link
                href="https://www.linkedin.com/in/benedict-tiong"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full sm:w-auto">
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </Button>
              </Link>
              <Link
                href="https://github.com/Benedict-CS"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full sm:w-auto">
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
