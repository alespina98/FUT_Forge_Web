import { detailMetadata, renderDetailPage } from "@/lib/fc27/entity-pages";
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){return detailMetadata("nations",(await params).slug)}
export default async function Page({params}:Props){return renderDetailPage("nations",(await params).slug)}
