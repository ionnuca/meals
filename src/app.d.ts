// Tipuri globale ale aplicației.
declare global {
	namespace App {
		interface Locals {
			user: { id: number; email: string; name: string } | null;
		}
	}
}

export {};
