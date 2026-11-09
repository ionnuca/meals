CREATE TABLE "meal_defaults" (
	"meal_type" text PRIMARY KEY NOT NULL,
	"servings" integer NOT NULL
);
--> statement-breakpoint
-- Valorile inițiale: 2 porții pentru fiecare masă (cât era implicit până acum).
INSERT INTO "meal_defaults" ("meal_type", "servings") VALUES
('mic_dejun', 2), ('pranz', 2), ('gustare', 2), ('cina', 2), ('alta', 2)
ON CONFLICT DO NOTHING;
