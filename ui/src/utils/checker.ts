export const isError = (item: any) => !!parseInt(item.error);
export const isFail = (item: any) => !!parseInt(item.fail);
export const isPreconditionFail = (item: any) => !!parseInt(item.preconditionFail);
export const isMissing = (item: any) => !!parseInt(item.missing);
export const isAnomaly = (item: any) => item.subscriptionCount > item.topicCount;
export const isSuccess = (item: any) => !isError(item) && !isFail(item) && !isMissing(item) && !isAnomaly(item);