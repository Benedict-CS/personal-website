import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PostsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between gap-4">
        <div className="h-9 w-40 rounded bg-slate-200" />
        <div className="flex gap-2">
          <div className="h-9 w-16 rounded bg-slate-200" />
          <div className="h-9 w-28 rounded bg-slate-200" />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Edited</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 w-4 rounded bg-slate-200" /></TableCell>
                <TableCell><div className="h-5 w-48 rounded bg-slate-100" /></TableCell>
                <TableCell><div className="h-5 w-20 rounded bg-slate-100" /></TableCell>
                <TableCell><div className="h-5 w-24 rounded bg-slate-100" /></TableCell>
                <TableCell><div className="h-5 w-24 rounded bg-slate-100" /></TableCell>
                <TableCell className="text-right"><div className="h-8 w-16 rounded bg-slate-100 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
