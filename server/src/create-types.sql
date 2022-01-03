--
-- TOC entry 2 (class 3079 OID 16441)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 836 (class 1247 OID 17831)
-- Name: claim_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE  public.claim_type AS ENUM (
    'normal',
    'turf',
    'lair'
);


--
-- TOC entry 845 (class 1247 OID 17890)
-- Name: cohort_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE  public.cohort_kind AS ENUM (
    'gang',
    'expert'
);


--
-- TOC entry 848 (class 1247 OID 17900)
-- Name: cohort_modifier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE   public.cohort_modifier AS ENUM (
    'edge',
    'flaw'
);


--
-- TOC entry 842 (class 1247 OID 17880)
-- Name: cohort_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE   public.cohort_state AS ENUM (
    'normal',
    'weak',
    'impared',
    'broken'
);


--
-- TOC entry 839 (class 1247 OID 17838)
-- Name: hold; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE   public.hold AS ENUM (
    'weak',
    'strong'
);


--
-- TOC entry 833 (class 1247 OID 16415)
-- Name: playbook_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE   public.playbook_type AS ENUM (
    'crew',
    'charakter'
);
