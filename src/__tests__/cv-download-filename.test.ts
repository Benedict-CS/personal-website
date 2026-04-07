import {
  DEFAULT_CV_DOWNLOAD_FILENAME,
  getCvDownloadFilename,
} from "@/lib/cv-download-filename";

describe("getCvDownloadFilename", () => {
  const orig = process.env.CV_DOWNLOAD_FILENAME;

  afterEach(() => {
    process.env.CV_DOWNLOAD_FILENAME = orig;
  });

  it("defaults to Benedict_CV.pdf", () => {
    delete process.env.CV_DOWNLOAD_FILENAME;
    expect(getCvDownloadFilename()).toBe(DEFAULT_CV_DOWNLOAD_FILENAME);
  });

  it("uses CV_DOWNLOAD_FILENAME when set", () => {
    process.env.CV_DOWNLOAD_FILENAME = "Jane_Doe_Resume.pdf";
    expect(getCvDownloadFilename()).toBe("Jane_Doe_Resume.pdf");
  });

  it("sanitizes unsafe characters", () => {
    process.env.CV_DOWNLOAD_FILENAME = 'evil"injection.pdf';
    expect(getCvDownloadFilename()).toBe("evil_injection.pdf");
  });
});
