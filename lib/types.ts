export type Team={id:number;name:string};
export type Match={id:number;round:number;teamA:number|null;teamB:number|null;sourceA:number|null;sourceB:number|null;scheduledAt:string;duration:number;court:number;status:'scheduled'|'called'|'live'|'finished';winnerId:number|null;setsWonA:number|null;setsWonB:number|null;score:string;note:string;reason:string;startedAt:string|null;finishedAt:string|null};
export type TournamentDay={date:string;startTime:string;endTime:string};
export type Config={transferAlias?:string;transferPhone?:string;transferBank?:string;transferAccount?:string;transferBeneficiary?:string;transferDocument?:string;title:string;brand:string;subtitle:string;sport:string;participantSingular:string;participantPlural:string;playingAreaSingular:string;playingAreaPlural:string;currency:string;scoringMode:'sets'|'winner';posterUrl:string;tagline:string;date:string;startTime:string;venue:string;address:string;mapsUrl:string;whatsappUrl:string;contact:string;courts:number;days:TournamentDay[];setsToWin:number|null;duration:number;entryFee:number;prize:number;prizeExtra:string;announcement:string;rules:string;scoring:string;foodNote:string};
export type MenuItem={id:number;name:string;description:string;price:number;available:boolean};
export type State={schemaVersion:number;revision:number;updatedAt:string|null;config:Config;teams:Team[];matches:Match[];menu:MenuItem[]};
export type Action=(type:string,payload:Record<string,unknown>)=>Promise<boolean>;

export type SessionUser={id:number;username:string;name:string;role:string;roleLabel:string;active:boolean;version:number;permissions:string[]};
export type Product={id:number;name:string;description:string;price:number;unitCost?:number|null;stock:number;lowStockThreshold:number;active:boolean;ready:boolean;version:number};
export type Sale={id:number;userId:number;operator:string;createdAt:string;date:string;payment:string;status:string;voidReason:string|null;total:number;units:number;cost?:number;replayed?:boolean;items:{productId:number;name:string;quantity:number;unitPrice:number;unitCost?:number}[]};
export type SalesReport={from:string;to:string;totals:{revenue:number;cost:number;margin:number;units:number;sales:number;voidedSales:number;cash:number;transfer:number};products:ReportRow[];operators:ReportRow[];days:ReportRow[]};
export type ReportRow={id:number|string;name:string;units:number;revenue:number;cost:number;margin:number};
