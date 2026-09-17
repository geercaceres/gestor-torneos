export const searchText=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function matchSearch(id,names,query){
 const text=searchText(query),code=text.match(/^(?:p\s*|partido\s*)?0*(\d+)$/);
 return code?Number(code[1])===id:names.some(name=>searchText(name).includes(text));
}
