export interface Step<S extends string = string> {
	at: number;
	duration?: number;
	state: S;
}
