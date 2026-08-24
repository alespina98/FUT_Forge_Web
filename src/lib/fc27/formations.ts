export type FormationPosition="GK"|"CB"|"LB"|"RB"|"LWB"|"RWB"|"CDM"|"CM"|"CAM"|"LM"|"RM"|"LW"|"RW"|"CF"|"ST";
export type FormationSlot={id:string;position:FormationPosition;x:number;y:number};
export type Formation={id:string;name:string;slots:FormationSlot[]};
const s=(id:string,position:FormationPosition,x:number,y:number):FormationSlot=>({id,position,x,y});
export const FORMATIONS:Formation[]=[
 {id:"442",name:"4-4-2",slots:[s("gk","GK",50,88),s("lb","LB",14,70),s("lcb","CB",38,73),s("rcb","CB",62,73),s("rb","RB",86,70),s("lm","LM",14,43),s("lcm","CM",38,48),s("rcm","CM",62,48),s("rm","RM",86,43),s("lst","ST",37,17),s("rst","ST",63,17)]},
 {id:"433",name:"4-3-3",slots:[s("gk","GK",50,88),s("lb","LB",14,70),s("lcb","CB",38,73),s("rcb","CB",62,73),s("rb","RB",86,70),s("lcm","CM",25,48),s("cm","CM",50,53),s("rcm","CM",75,48),s("lw","LW",16,20),s("st","ST",50,14),s("rw","RW",84,20)]},
 {id:"433-4",name:"4-3-3 (4)",slots:[s("gk","GK",50,88),s("lb","LB",14,70),s("lcb","CB",38,73),s("rcb","CB",62,73),s("rb","RB",86,70),s("lcm","CM",32,52),s("rcm","CM",68,52),s("cam","CAM",50,36),s("lw","LW",16,18),s("st","ST",50,12),s("rw","RW",84,18)]},
 {id:"4231",name:"4-2-3-1",slots:[s("gk","GK",50,88),s("lb","LB",14,70),s("lcb","CB",38,73),s("rcb","CB",62,73),s("rb","RB",86,70),s("lcdm","CDM",35,54),s("rcdm","CDM",65,54),s("lam","CAM",20,34),s("cam","CAM",50,38),s("ram","CAM",80,34),s("st","ST",50,12)]},
 {id:"4222",name:"4-2-2-2",slots:[s("gk","GK",50,88),s("lb","LB",14,70),s("lcb","CB",38,73),s("rcb","CB",62,73),s("rb","RB",86,70),s("lcdm","CDM",35,54),s("rcdm","CDM",65,54),s("lcam","CAM",22,34),s("rcam","CAM",78,34),s("lst","ST",38,13),s("rst","ST",62,13)]},
 {id:"41212",name:"4-1-2-1-2",slots:[s("gk","GK",50,88),s("lb","LB",14,70),s("lcb","CB",38,73),s("rcb","CB",62,73),s("rb","RB",86,70),s("cdm","CDM",50,57),s("lm","LM",20,43),s("rm","RM",80,43),s("cam","CAM",50,32),s("lst","ST",38,13),s("rst","ST",62,13)]},
 {id:"41212-2",name:"4-1-2-1-2 (2)",slots:[s("gk","GK",50,88),s("lb","LB",14,70),s("lcb","CB",38,73),s("rcb","CB",62,73),s("rb","RB",86,70),s("cdm","CDM",50,58),s("lcm","CM",30,45),s("rcm","CM",70,45),s("cam","CAM",50,31),s("lst","ST",38,13),s("rst","ST",62,13)]},
 {id:"4321",name:"4-3-2-1",slots:[s("gk","GK",50,88),s("lb","LB",14,70),s("lcb","CB",38,73),s("rcb","CB",62,73),s("rb","RB",86,70),s("lcm","CM",25,49),s("cm","CM",50,54),s("rcm","CM",75,49),s("lcf","CF",27,27),s("rcf","CF",73,27),s("st","ST",50,11)]},
 {id:"451",name:"4-5-1",slots:[s("gk","GK",50,88),s("lb","LB",14,70),s("lcb","CB",38,73),s("rcb","CB",62,73),s("rb","RB",86,70),s("lm","LM",13,42),s("lcm","CM",36,49),s("rcm","CM",64,49),s("rm","RM",87,42),s("cam","CAM",50,32),s("st","ST",50,12)]},
 {id:"4141",name:"4-1-4-1",slots:[s("gk","GK",50,88),s("lb","LB",14,70),s("lcb","CB",38,73),s("rcb","CB",62,73),s("rb","RB",86,70),s("cdm","CDM",50,58),s("lm","LM",14,38),s("lcm","CM",38,43),s("rcm","CM",62,43),s("rm","RM",86,38),s("st","ST",50,13)]},
 {id:"352",name:"3-5-2",slots:[s("gk","GK",50,88),s("lcb","CB",25,70),s("cb","CB",50,75),s("rcb","CB",75,70),s("lm","LM",12,43),s("lcdm","CDM",37,55),s("rcdm","CDM",63,55),s("rm","RM",88,43),s("cam","CAM",50,35),s("lst","ST",37,13),s("rst","ST",63,13)]},
 {id:"3421",name:"3-4-2-1",slots:[s("gk","GK",50,88),s("lcb","CB",25,70),s("cb","CB",50,75),s("rcb","CB",75,70),s("lm","LM",15,47),s("lcm","CM",38,51),s("rcm","CM",62,51),s("rm","RM",85,47),s("lcf","CF",28,27),s("rcf","CF",72,27),s("st","ST",50,10)]},
 {id:"5212",name:"5-2-1-2",slots:[s("gk","GK",50,89),s("lwb","LWB",10,61),s("lcb","CB",30,72),s("cb","CB",50,76),s("rcb","CB",70,72),s("rwb","RWB",90,61),s("lcm","CM",35,48),s("rcm","CM",65,48),s("cam","CAM",50,31),s("lst","ST",38,12),s("rst","ST",62,12)]},
];
export const DEFAULT_FORMATION_ID="433";
export function formationById(id:string|undefined){return FORMATIONS.find(f=>f.id===id)??FORMATIONS.find(f=>f.id===DEFAULT_FORMATION_ID)!}
