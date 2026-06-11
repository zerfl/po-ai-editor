export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateRequestTokens(request: any): number {
  const requestStr = JSON.stringify(request);
  return estimateTokens(requestStr);
}
