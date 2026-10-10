export type AIProviderId='off'|'gemini'
export type AIStatus='disabled'|'ready'|'error'
export interface AIWordCandidate {term:string;definition:string;partOfSpeech?:string;example?:string;exampleTranslation?:string;chapter?:string;page?:string;tags?:string[];aiSuggestedFields?:string[]}
export interface AIProvider {readonly id:AIProviderId;readonly label:string;isConfigured():boolean;status():AIStatus;organize(text:string,token:string):Promise<AIWordCandidate[]>}
