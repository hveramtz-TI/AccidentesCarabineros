-- CreateTable
CREATE TABLE "region" (
    "region_id" SMALLINT NOT NULL,
    "nombre_normal" TEXT NOT NULL,
    "nombre_estandarizado" TEXT NOT NULL,
    "nombre_abreviado" TEXT NOT NULL,
    "numero_romano" TEXT NOT NULL,

    CONSTRAINT "region_pkey" PRIMARY KEY ("region_id")
);

-- CreateTable
CREATE TABLE "comuna" (
    "comuna_id" TEXT NOT NULL,
    "region_id" SMALLINT NOT NULL,
    "nombre_normal" TEXT NOT NULL,
    "nombre_estandarizado" TEXT NOT NULL,

    CONSTRAINT "comuna_pkey" PRIMARY KEY ("comuna_id")
);

-- CreateTable
CREATE TABLE "comuna_alias" (
    "nombre_estandarizado_alias" TEXT NOT NULL,
    "comuna_id" TEXT NOT NULL,
    "nombre_origen" TEXT,

    CONSTRAINT "comuna_alias_pkey" PRIMARY KEY ("nombre_estandarizado_alias")
);

-- CreateTable
CREATE TABLE "zona" (
    "zona_id" SERIAL NOT NULL,
    "nombre_normal" TEXT NOT NULL,
    "nombre_estandarizado" TEXT NOT NULL,

    CONSTRAINT "zona_pkey" PRIMARY KEY ("zona_id")
);

-- CreateTable
CREATE TABLE "tipo_siniestro" (
    "tipo_siniestro_id" SERIAL NOT NULL,
    "nombre_normal" TEXT NOT NULL,
    "nombre_estandarizado" TEXT NOT NULL,

    CONSTRAINT "tipo_siniestro_pkey" PRIMARY KEY ("tipo_siniestro_id")
);

-- CreateTable
CREATE TABLE "causa" (
    "causa_id" SERIAL NOT NULL,
    "nombre_normal" TEXT NOT NULL,
    "nombre_estandarizado" TEXT NOT NULL,

    CONSTRAINT "causa_pkey" PRIMARY KEY ("causa_id")
);

-- CreateTable
CREATE TABLE "sector" (
    "sector_id" SERIAL NOT NULL,
    "nombre_normal" TEXT NOT NULL,
    "nombre_estandarizado" TEXT NOT NULL,

    CONSTRAINT "sector_pkey" PRIMARY KEY ("sector_id")
);

-- CreateTable
CREATE TABLE "calidad_persona" (
    "calidad_persona_id" SERIAL NOT NULL,
    "nombre_normal" TEXT NOT NULL,
    "nombre_estandarizado" TEXT NOT NULL,

    CONSTRAINT "calidad_persona_pkey" PRIMARY KEY ("calidad_persona_id")
);

-- CreateTable
CREATE TABLE "sexo" (
    "sexo_id" SERIAL NOT NULL,
    "nombre_normal" TEXT NOT NULL,
    "nombre_estandarizado" TEXT NOT NULL,

    CONSTRAINT "sexo_pkey" PRIMARY KEY ("sexo_id")
);

-- CreateTable
CREATE TABLE "resultado_persona" (
    "resultado_persona_id" SERIAL NOT NULL,
    "nombre_normal" TEXT NOT NULL,
    "nombre_estandarizado" TEXT NOT NULL,

    CONSTRAINT "resultado_persona_pkey" PRIMARY KEY ("resultado_persona_id")
);

-- CreateTable
CREATE TABLE "tipo_vehiculo" (
    "tipo_vehiculo_id" SERIAL NOT NULL,
    "nombre_normal" TEXT NOT NULL,
    "nombre_estandarizado" TEXT NOT NULL,

    CONSTRAINT "tipo_vehiculo_pkey" PRIMARY KEY ("tipo_vehiculo_id")
);

-- CreateTable
CREATE TABLE "servicio_vehiculo" (
    "servicio_vehiculo_id" SERIAL NOT NULL,
    "nombre_normal" TEXT NOT NULL,
    "nombre_estandarizado" TEXT NOT NULL,

    CONSTRAINT "servicio_vehiculo_pkey" PRIMARY KEY ("servicio_vehiculo_id")
);

-- CreateTable
CREATE TABLE "siniestro" (
    "siniestro_id" BIGSERIAL NOT NULL,
    "id_fuente" BIGINT NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TIME(6) NOT NULL,
    "comuna_id" TEXT NOT NULL,
    "zona_id" INTEGER NOT NULL,
    "tipo_siniestro_id" INTEGER NOT NULL,
    "causa_id" INTEGER NOT NULL,
    "sector_id" INTEGER NOT NULL,
    "fallecidos" INTEGER NOT NULL,
    "lesionados_graves" INTEGER NOT NULL,
    "lesionados_menos_graves" INTEGER NOT NULL,
    "lesionados_leves" INTEGER NOT NULL,
    "ilesos" INTEGER NOT NULL,
    "calle_1" TEXT,
    "calle_2" TEXT,
    "km_referencia" TEXT,
    "numero_parte" TEXT NOT NULL,
    "tribunal" TEXT NOT NULL,

    CONSTRAINT "siniestro_pkey" PRIMARY KEY ("siniestro_id")
);

-- CreateTable
CREATE TABLE "persona" (
    "persona_id" BIGSERIAL NOT NULL,
    "siniestro_id" BIGINT NOT NULL,
    "calidad_persona_id" INTEGER NOT NULL,
    "sexo_id" INTEGER NOT NULL,
    "resultado_persona_id" INTEGER NOT NULL,
    "edad" SMALLINT,

    CONSTRAINT "persona_pkey" PRIMARY KEY ("persona_id")
);

-- CreateTable
CREATE TABLE "vehiculo" (
    "vehiculo_id" BIGSERIAL NOT NULL,
    "siniestro_id" BIGINT NOT NULL,
    "tipo_vehiculo_id" INTEGER NOT NULL,
    "servicio_vehiculo_id" INTEGER NOT NULL,

    CONSTRAINT "vehiculo_pkey" PRIMARY KEY ("vehiculo_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "region_nombre_estandarizado_key" ON "region"("nombre_estandarizado");

-- CreateIndex
CREATE UNIQUE INDEX "region_nombre_abreviado_key" ON "region"("nombre_abreviado");

-- CreateIndex
CREATE UNIQUE INDEX "region_numero_romano_key" ON "region"("numero_romano");

-- CreateIndex
CREATE UNIQUE INDEX "comuna_nombre_estandarizado_key" ON "comuna"("nombre_estandarizado");

-- CreateIndex
CREATE INDEX "comuna_region_id_idx" ON "comuna"("region_id");

-- CreateIndex
CREATE INDEX "comuna_alias_comuna_id_idx" ON "comuna_alias"("comuna_id");

-- CreateIndex
CREATE UNIQUE INDEX "zona_nombre_estandarizado_key" ON "zona"("nombre_estandarizado");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_siniestro_nombre_estandarizado_key" ON "tipo_siniestro"("nombre_estandarizado");

-- CreateIndex
CREATE UNIQUE INDEX "causa_nombre_estandarizado_key" ON "causa"("nombre_estandarizado");

-- CreateIndex
CREATE UNIQUE INDEX "sector_nombre_estandarizado_key" ON "sector"("nombre_estandarizado");

-- CreateIndex
CREATE UNIQUE INDEX "calidad_persona_nombre_estandarizado_key" ON "calidad_persona"("nombre_estandarizado");

-- CreateIndex
CREATE UNIQUE INDEX "sexo_nombre_estandarizado_key" ON "sexo"("nombre_estandarizado");

-- CreateIndex
CREATE UNIQUE INDEX "resultado_persona_nombre_estandarizado_key" ON "resultado_persona"("nombre_estandarizado");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_vehiculo_nombre_estandarizado_key" ON "tipo_vehiculo"("nombre_estandarizado");

-- CreateIndex
CREATE UNIQUE INDEX "servicio_vehiculo_nombre_estandarizado_key" ON "servicio_vehiculo"("nombre_estandarizado");

-- CreateIndex
CREATE UNIQUE INDEX "siniestro_id_fuente_key" ON "siniestro"("id_fuente");

-- CreateIndex
CREATE INDEX "siniestro_comuna_id_idx" ON "siniestro"("comuna_id");

-- CreateIndex
CREATE INDEX "siniestro_zona_id_idx" ON "siniestro"("zona_id");

-- CreateIndex
CREATE INDEX "siniestro_tipo_siniestro_id_idx" ON "siniestro"("tipo_siniestro_id");

-- CreateIndex
CREATE INDEX "siniestro_causa_id_idx" ON "siniestro"("causa_id");

-- CreateIndex
CREATE INDEX "siniestro_sector_id_idx" ON "siniestro"("sector_id");

-- CreateIndex
CREATE INDEX "siniestro_fecha_idx" ON "siniestro"("fecha");

-- CreateIndex
CREATE INDEX "persona_siniestro_id_idx" ON "persona"("siniestro_id");

-- CreateIndex
CREATE INDEX "persona_calidad_persona_id_idx" ON "persona"("calidad_persona_id");

-- CreateIndex
CREATE INDEX "persona_sexo_id_idx" ON "persona"("sexo_id");

-- CreateIndex
CREATE INDEX "persona_resultado_persona_id_idx" ON "persona"("resultado_persona_id");

-- CreateIndex
CREATE INDEX "vehiculo_siniestro_id_idx" ON "vehiculo"("siniestro_id");

-- CreateIndex
CREATE INDEX "vehiculo_tipo_vehiculo_id_idx" ON "vehiculo"("tipo_vehiculo_id");

-- CreateIndex
CREATE INDEX "vehiculo_servicio_vehiculo_id_idx" ON "vehiculo"("servicio_vehiculo_id");

-- AddForeignKey
ALTER TABLE "comuna" ADD CONSTRAINT "comuna_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "region"("region_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comuna_alias" ADD CONSTRAINT "comuna_alias_comuna_id_fkey" FOREIGN KEY ("comuna_id") REFERENCES "comuna"("comuna_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestro" ADD CONSTRAINT "siniestro_comuna_id_fkey" FOREIGN KEY ("comuna_id") REFERENCES "comuna"("comuna_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestro" ADD CONSTRAINT "siniestro_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona"("zona_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestro" ADD CONSTRAINT "siniestro_tipo_siniestro_id_fkey" FOREIGN KEY ("tipo_siniestro_id") REFERENCES "tipo_siniestro"("tipo_siniestro_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestro" ADD CONSTRAINT "siniestro_causa_id_fkey" FOREIGN KEY ("causa_id") REFERENCES "causa"("causa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestro" ADD CONSTRAINT "siniestro_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sector"("sector_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona" ADD CONSTRAINT "persona_siniestro_id_fkey" FOREIGN KEY ("siniestro_id") REFERENCES "siniestro"("siniestro_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona" ADD CONSTRAINT "persona_calidad_persona_id_fkey" FOREIGN KEY ("calidad_persona_id") REFERENCES "calidad_persona"("calidad_persona_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona" ADD CONSTRAINT "persona_sexo_id_fkey" FOREIGN KEY ("sexo_id") REFERENCES "sexo"("sexo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona" ADD CONSTRAINT "persona_resultado_persona_id_fkey" FOREIGN KEY ("resultado_persona_id") REFERENCES "resultado_persona"("resultado_persona_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculo" ADD CONSTRAINT "vehiculo_siniestro_id_fkey" FOREIGN KEY ("siniestro_id") REFERENCES "siniestro"("siniestro_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculo" ADD CONSTRAINT "vehiculo_tipo_vehiculo_id_fkey" FOREIGN KEY ("tipo_vehiculo_id") REFERENCES "tipo_vehiculo"("tipo_vehiculo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculo" ADD CONSTRAINT "vehiculo_servicio_vehiculo_id_fkey" FOREIGN KEY ("servicio_vehiculo_id") REFERENCES "servicio_vehiculo"("servicio_vehiculo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraints
-- PostgreSQL CHECK constraints are required by MER.md section 5 but are not
-- expressible in schema.prisma, so they are appended to this migration by hand.
ALTER TABLE "siniestro"
    ADD CONSTRAINT "siniestro_fallecidos_check" CHECK ("fallecidos" >= 0),
    ADD CONSTRAINT "siniestro_lesionados_graves_check" CHECK ("lesionados_graves" >= 0),
    ADD CONSTRAINT "siniestro_lesionados_menos_graves_check" CHECK ("lesionados_menos_graves" >= 0),
    ADD CONSTRAINT "siniestro_lesionados_leves_check" CHECK ("lesionados_leves" >= 0),
    ADD CONSTRAINT "siniestro_ilesos_check" CHECK ("ilesos" >= 0);

ALTER TABLE "persona"
    ADD CONSTRAINT "persona_edad_check" CHECK ("edad" IS NULL OR ("edad" BETWEEN 1 AND 120));
