import type { Metadata } from "next";
import { Fc27StatFinderView } from "@/components/fc27/stat-finder-view";
import { copy, siteCopy } from "@/lib/copy";
import { fetchFilterOptions } from "@/lib/fc27/players";
import { fetchStatFinder } from "@/lib/fc27/stat-finder";
import { DETAIL_GROUPS, FACE_FILTERS, GK_FILTERS, isStatFinderSort, type NumericParam, type StatFinderQuery } from "@/lib/fc27/stat-finder-shared";
import { JsonLd } from "@/components/json-ld";
import { pageJsonLd } from "@/lib/fc27/structured-data";

export const metadata:Metadata={title:{absolute:copy.en.fc27StatFinderPage.metaTitle},description:copy.en.fc27StatFinderPage.metaDescription,alternates:{canonical:"/fc27/stat-finder"},robots:{index:true,follow:true},openGraph:{type:"website",url:"/fc27/stat-finder",title:copy.en.fc27StatFinderPage.metaTitle,description:copy.en.fc27StatFinderPage.metaDescription,siteName:siteCopy.applicationName,locale:"en_US",alternateLocale:["it_IT"]},twitter:{card:"summary",title:copy.en.fc27StatFinderPage.metaTitle,description:copy.en.fc27StatFinderPage.metaDescription}};
type Params=Record<string,string|string[]|undefined>;
function first(value:string|string[]|undefined){return (Array.isArray(value)?value[0]:value)?.trim()||undefined;}
function numeric(value:string|undefined,max=99){if(!value||!/^[0-9]+$/.test(value))return undefined;const n=Number(value);return n>=1&&n<=max?n:undefined;}
const numericNames=["ovrMin","ovrMax","skillMovesMin","weakFootMin",...FACE_FILTERS.map(x=>x[0]),...GK_FILTERS.map(x=>x[0]),...Object.values(DETAIL_GROUPS).flatMap(g=>g.map(x=>x[0]))] as NumericParam[];

export default async function Fc27StatFinderPage({searchParams}:{searchParams:Promise<Params>}){
  const raw=await searchParams;const options=await fetchFilterOptions();const positionRaw=first(raw.position)?.toUpperCase();const position=positionRaw&&options.positions.includes(positionRaw)?positionRaw:undefined;
  const numericValues:Partial<Record<NumericParam,number>>={};const initial:Record<string,string>={};
  for(const name of numericNames){const max=name==="skillMovesMin"||name==="weakFootMin"?5:99;const value=numeric(first(raw[name]),max);if(value){numericValues[name]=value;initial[name]=String(value);}}
  const text=(name:string,max=80)=>{const value=first(raw[name])?.slice(0,max);if(value)initial[name]=value;return value;};
  const q=text("q");const nationRaw=text("nation");const nation=nationRaw&&options.nations.includes(nationRaw)?nationRaw:undefined;if(nationRaw&&!nation)delete initial.nation;
  const leagueRaw=text("league");const league=leagueRaw&&options.leagues.includes(leagueRaw)?leagueRaw:undefined;if(leagueRaw&&!league)delete initial.league;
  const club=text("club");if(position)initial.position=position;const footRaw=first(raw.preferredFoot);const foot=footRaw==="Right"||footRaw==="Left"?footRaw:undefined;if(foot)initial.preferredFoot=foot;
  const sortRaw=first(raw.sort);const sort=isStatFinderSort(sortRaw)?sortRaw:"overall";if(sort!=="overall")initial.sort=sort;const page=Math.max(1,numeric(first(raw.page),9999)??1);if(page>1)initial.page=String(page);
  const query:StatFinderQuery={q,position,nation,league,club,preferredFoot:foot,sort,page,numeric:numericValues};const result=await fetchStatFinder(query);
  const jsonLd=pageJsonLd({path:"/fc27/stat-finder",name:copy.en.fc27StatFinderPage.metaTitle,description:copy.en.fc27StatFinderPage.metaDescription,breadcrumbs:[{name:"EA FC 27",path:"/fc27/players"},{name:"Players",path:"/fc27/players"},{name:"Stat Finder",path:"/fc27/stat-finder"}]});
  return <><JsonLd data={jsonLd}/><Fc27StatFinderView result={result} options={options} initial={initial}/></>;
}
