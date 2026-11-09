import Link from "next/link";
import { teamMembers, type TeamProject } from "@/lib/team";

export function ProjectCredits({ project }: { project: TeamProject }) {
  return <ul aria-label={`${project.title} creator credits`} className="flex flex-wrap gap-x-6 gap-y-2 text-sm leading-6">
    {project.creators.map((credit) => <li key={credit.slug}><span className="text-[#d3c8d9]">{credit.role}: </span><Link href={`/about#project-${credit.slug}-${project.slug}`} className="inline-flex min-h-11 items-center font-semibold text-[#eee1f4] underline underline-offset-4">{teamMembers.find((person) => person.slug === credit.slug)?.name}</Link></li>)}
  </ul>;
}
