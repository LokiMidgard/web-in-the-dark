
CREATE SEQUENCE IF NOT EXISTS public."CLOCKS_id_seq"
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.clocks
(
    id integer NOT NULL DEFAULT nextval('"CLOCKS_id_seq"'::regclass),
    name text COLLATE pg_catalog."default",
    segments integer NOT NULL,
    value integer NOT NULL,
    CONSTRAINT "CLOCKS_pkey" PRIMARY KEY (id)
);