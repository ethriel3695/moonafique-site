import { CreationPhotoGallery } from "@/components/creation-photo-gallery";
import { ProjectCredits } from "@/components/project-credits";
import { novemberGrimmWorld } from "@/lib/team";

export function GrimmWorldsCollection() {
  const project = novemberGrimmWorld;
  return <section id="grimm-worlds" aria-labelledby="grimm-worlds-title" className="mt-10 scroll-mt-28 overflow-hidden rounded-[2rem] bg-[#1e1826] p-6 text-[#fbf5ec] sm:p-10 lg:p-12">
    <p className="text-xs font-bold uppercase tracking-[.2em] text-[#d6b9eb]">The Grimm Worlds collection</p>
    <h2 id="grimm-worlds-title" className="mt-4 text-3xl sm:text-4xl">Little worlds. A closer look.</h2>
    <p className="mt-4 max-w-2xl leading-7 text-[#d3c8d9]">Open the cover and step into the scenery. Our Grimm Worlds bring a character and its surroundings together in a keepsake box.</p>
    <article id={project.slug} aria-labelledby={`${project.slug}-title`} className="mt-8 grid scroll-mt-28 items-start gap-7 lg:grid-cols-[1.1fr_.9fr] lg:gap-10">
      <CreationPhotoGallery title={project.title} photos={project.photos} />
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#d6b9eb]">{project.occasion}</p>
        <h3 id={`${project.slug}-title`} className="mt-3 text-3xl">{project.title}</h3>
        <p className="mt-4 leading-7 text-[#eee1f4]">{project.description}</p>
        <div className="mt-5 border-y border-white/15 py-3"><ProjectCredits project={project} /></div>
        <p className="mt-5 text-sm leading-6 text-[#d3c8d9]">Created for Grimmfest on Whatnot. Monthly memberships are separate releases. This gallery celebrates the finished piece; it does not indicate current availability.</p>
      </div>
    </article>
  </section>;
}
