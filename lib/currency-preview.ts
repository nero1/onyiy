export type CurrencyPreviewState={
  count:number;allowed:boolean;paused:boolean;visible:boolean;focused:boolean;
  reducedMotion:boolean;now:number;lastActivity:number;lastAdvance:number;interval:number;
};
export function mayAdvanceCurrency(value:CurrencyPreviewState){
  return value.count>1&&value.allowed&&!value.paused&&value.visible&&!value.focused&&!value.reducedMotion
    &&Number.isFinite(value.interval)&&value.interval>0
    &&value.now-value.lastActivity>=value.interval&&value.now-value.lastAdvance>=value.interval;
}
