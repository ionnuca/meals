ALTER TABLE "meal_defaults" ADD COLUMN "daily" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Implicit, fiecare zi are trei mese: mic dejun, prânz și cină.
INSERT INTO "meal_defaults" ("meal_type", "servings", "daily") VALUES
('mic_dejun', 2, true), ('pranz', 2, true), ('cina', 2, true)
ON CONFLICT ("meal_type") DO UPDATE SET "daily" = true;
