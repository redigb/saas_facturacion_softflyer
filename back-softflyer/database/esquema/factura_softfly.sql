-- Esquema de referencia de factura_softfly (solo estructura, sin datos).
-- Generado con: php artisan schema:dump --database=pgsql_owner (2026-10-04)
-- La fuente de verdad son las migraciones; este archivo NO se ejecuta automaticamente.
-- Regenerar despues de cada migracion nueva.

--
-- PostgreSQL database dump
--

\restrict KRWIJivzy6Pre4kBZqxtd4Pv0afYmX1ix9rCAhh0pxtM1EM5cYByG6XMW2HthDo

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: administradores_plataforma; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.administradores_plataforma (
    id bigint NOT NULL,
    nombre character varying(255) NOT NULL,
    correo character varying(255) NOT NULL,
    contrasena character varying(255) NOT NULL,
    es_activo boolean DEFAULT true NOT NULL,
    ultimo_acceso_en timestamp(0) with time zone,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone
);


--
-- Name: administradores_plataforma_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.administradores_plataforma_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: administradores_plataforma_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.administradores_plataforma_id_seq OWNED BY public.administradores_plataforma.id;


--
-- Name: bitacora_plataforma; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_plataforma (
    id bigint NOT NULL,
    administrador_id bigint NOT NULL,
    inquilino_id bigint,
    accion character varying(40) NOT NULL,
    detalle jsonb DEFAULT '{}'::jsonb NOT NULL,
    creado_en timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT bitacora_plataforma_accion_check CHECK (((accion)::text = ANY ((ARRAY['CLIENTE_CREADO'::character varying, 'PLAN_ACTIVADO'::character varying, 'PRUEBA_EXTENDIDA'::character varying, 'CLIENTE_SUSPENDIDO'::character varying, 'CLIENTE_REACTIVADO'::character varying, 'ENLACE_REENVIADO'::character varying])::text[])))
);


--
-- Name: bitacora_plataforma_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bitacora_plataforma_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bitacora_plataforma_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bitacora_plataforma_id_seq OWNED BY public.bitacora_plataforma.id;


--
-- Name: cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);


--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);


--
-- Name: categoria_estacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categoria_estacion (
    inquilino_id bigint NOT NULL,
    categoria_id bigint NOT NULL,
    estacion_preparacion_id bigint NOT NULL
);

ALTER TABLE ONLY public.categoria_estacion FORCE ROW LEVEL SECURITY;


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    nombre character varying(80) NOT NULL,
    color character(7),
    orden smallint DEFAULT '0'::smallint NOT NULL,
    es_activa boolean DEFAULT true NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    eliminado_en timestamp(0) with time zone,
    CONSTRAINT categorias_color_check CHECK ((color ~ '^#[0-9a-fA-F]{6}$'::text))
);

ALTER TABLE ONLY public.categorias FORCE ROW LEVEL SECURITY;


--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: certificados_digitales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificados_digitales (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    empresa_id bigint NOT NULL,
    pem_cifrado text NOT NULL,
    formato_origen character varying(3) NOT NULL,
    vence_en date NOT NULL,
    es_activo boolean DEFAULT true NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    CONSTRAINT certificados_formato_check CHECK (((formato_origen)::text = ANY ((ARRAY['PFX'::character varying, 'PEM'::character varying])::text[])))
);

ALTER TABLE ONLY public.certificados_digitales FORCE ROW LEVEL SECURITY;


--
-- Name: certificados_digitales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.certificados_digitales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: certificados_digitales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.certificados_digitales_id_seq OWNED BY public.certificados_digitales.id;


--
-- Name: elementos_plano; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elementos_plano (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    salon_id bigint NOT NULL,
    tipo character varying(12) NOT NULL,
    etiqueta character varying(40),
    pos_x numeric(8,2) DEFAULT '0'::numeric NOT NULL,
    pos_y numeric(8,2) DEFAULT '0'::numeric NOT NULL,
    ancho numeric(8,2) NOT NULL,
    alto numeric(8,2) NOT NULL,
    rotacion smallint DEFAULT '0'::smallint NOT NULL,
    capa smallint DEFAULT '0'::smallint NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    CONSTRAINT elementos_plano_geometria_check CHECK (((ancho > (0)::numeric) AND (alto > (0)::numeric) AND (pos_x >= (0)::numeric) AND (pos_y >= (0)::numeric) AND ((rotacion >= 0) AND (rotacion <= 359)))),
    CONSTRAINT elementos_plano_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['BARRA'::character varying, 'PARED'::character varying, 'PUERTA'::character varying, 'VENTANA'::character varying, 'COLUMNA'::character varying, 'PLANTA'::character varying, 'BANO'::character varying, 'CAJA'::character varying, 'COCINA'::character varying, 'TEXTO'::character varying])::text[])))
);

ALTER TABLE ONLY public.elementos_plano FORCE ROW LEVEL SECURITY;


--
-- Name: elementos_plano_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.elementos_plano_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: elementos_plano_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.elementos_plano_id_seq OWNED BY public.elementos_plano.id;


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresas (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    ruc character(11),
    razon_social character varying(255),
    nombre_comercial character varying(255) NOT NULL,
    direccion_fiscal character varying(255),
    ubigeo_id bigint,
    usuario_sol character varying(30),
    clave_sol_cifrada text,
    homologado boolean DEFAULT false NOT NULL,
    aplica_tasa_reducida boolean DEFAULT false NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    eliminado_en timestamp(0) with time zone,
    CONSTRAINT empresas_ruc_check CHECK ((ruc ~ '^(10|15|17|20)[0-9]{9}$'::text))
);

ALTER TABLE ONLY public.empresas FORCE ROW LEVEL SECURITY;


--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;


--
-- Name: estaciones_preparacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estaciones_preparacion (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    nombre character varying(60) NOT NULL,
    es_activa boolean DEFAULT true NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone
);

ALTER TABLE ONLY public.estaciones_preparacion FORCE ROW LEVEL SECURITY;


--
-- Name: estaciones_preparacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estaciones_preparacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estaciones_preparacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estaciones_preparacion_id_seq OWNED BY public.estaciones_preparacion.id;


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: inquilinos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inquilinos (
    id bigint NOT NULL,
    slug character varying(63) NOT NULL,
    nombre character varying(255) NOT NULL,
    estado character varying(20) DEFAULT 'PRUEBA'::character varying NOT NULL,
    es_demo boolean DEFAULT false NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    CONSTRAINT inquilinos_estado_check CHECK (((estado)::text = ANY ((ARRAY['PRUEBA'::character varying, 'ACTIVO'::character varying, 'MOROSO'::character varying, 'SUSPENDIDO'::character varying, 'CANCELADO'::character varying])::text[]))),
    CONSTRAINT inquilinos_slug_check CHECK (((slug)::text ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'::text))
);


--
-- Name: inquilinos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inquilinos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inquilinos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inquilinos_id_seq OWNED BY public.inquilinos.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: mesas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mesas (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    salon_id bigint NOT NULL,
    codigo character varying(10) NOT NULL,
    capacidad smallint DEFAULT '4'::smallint NOT NULL,
    forma character varying(12) DEFAULT 'CUADRADA'::character varying NOT NULL,
    pos_x numeric(8,2) DEFAULT '0'::numeric NOT NULL,
    pos_y numeric(8,2) DEFAULT '0'::numeric NOT NULL,
    ancho numeric(8,2) NOT NULL,
    alto numeric(8,2) NOT NULL,
    rotacion smallint DEFAULT '0'::smallint NOT NULL,
    estado character varying(12) DEFAULT 'LIBRE'::character varying NOT NULL,
    es_activa boolean DEFAULT true NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    CONSTRAINT mesas_capacidad_check CHECK ((capacidad > 0)),
    CONSTRAINT mesas_estado_check CHECK (((estado)::text = ANY ((ARRAY['LIBRE'::character varying, 'OCUPADA'::character varying, 'POR_COBRAR'::character varying, 'BLOQUEADA'::character varying])::text[]))),
    CONSTRAINT mesas_forma_check CHECK (((forma)::text = ANY ((ARRAY['CUADRADA'::character varying, 'REDONDA'::character varying, 'RECTANGULAR'::character varying])::text[]))),
    CONSTRAINT mesas_geometria_check CHECK (((ancho > (0)::numeric) AND (alto > (0)::numeric) AND (pos_x >= (0)::numeric) AND (pos_y >= (0)::numeric) AND ((rotacion >= 0) AND (rotacion <= 359))))
);

ALTER TABLE ONLY public.mesas FORCE ROW LEVEL SECURITY;


--
-- Name: mesas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mesas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mesas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mesas_id_seq OWNED BY public.mesas.id;


--
-- Name: metodos_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metodos_pago (
    id smallint NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(60) NOT NULL,
    es_efectivo boolean DEFAULT false NOT NULL,
    es_activo boolean DEFAULT true NOT NULL
);


--
-- Name: metodos_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.metodos_pago_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: metodos_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.metodos_pago_id_seq OWNED BY public.metodos_pago.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: modificador_grupos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modificador_grupos (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    nombre character varying(60) NOT NULL,
    seleccion_minima smallint DEFAULT '0'::smallint NOT NULL,
    seleccion_maxima smallint DEFAULT '1'::smallint NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    CONSTRAINT modificador_grupos_seleccion_check CHECK (((seleccion_maxima >= 1) AND (seleccion_minima <= seleccion_maxima)))
);

ALTER TABLE ONLY public.modificador_grupos FORCE ROW LEVEL SECURITY;


--
-- Name: modificador_grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modificador_grupos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modificador_grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modificador_grupos_id_seq OWNED BY public.modificador_grupos.id;


--
-- Name: modificadores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modificadores (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    modificador_grupo_id bigint NOT NULL,
    nombre character varying(60) NOT NULL,
    precio_adicional numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    orden smallint DEFAULT '0'::smallint NOT NULL,
    es_activo boolean DEFAULT true NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    CONSTRAINT modificadores_precio_check CHECK ((precio_adicional >= (0)::numeric))
);

ALTER TABLE ONLY public.modificadores FORCE ROW LEVEL SECURITY;


--
-- Name: modificadores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modificadores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modificadores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modificadores_id_seq OWNED BY public.modificadores.id;


--
-- Name: monedas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monedas (
    id smallint NOT NULL,
    codigo character varying(3) NOT NULL,
    nombre character varying(120) NOT NULL,
    es_activo boolean DEFAULT true NOT NULL,
    simbolo character varying(5) NOT NULL
);


--
-- Name: monedas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.monedas_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monedas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monedas_id_seq OWNED BY public.monedas.id;


--
-- Name: motivos_nota_credito; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.motivos_nota_credito (
    id smallint NOT NULL,
    codigo character varying(2) NOT NULL,
    nombre character varying(120) NOT NULL,
    es_activo boolean DEFAULT true NOT NULL
);


--
-- Name: motivos_nota_credito_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.motivos_nota_credito_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: motivos_nota_credito_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.motivos_nota_credito_id_seq OWNED BY public.motivos_nota_credito.id;


--
-- Name: motivos_nota_debito; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.motivos_nota_debito (
    id smallint NOT NULL,
    codigo character varying(2) NOT NULL,
    nombre character varying(120) NOT NULL,
    es_activo boolean DEFAULT true NOT NULL
);


--
-- Name: motivos_nota_debito_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.motivos_nota_debito_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: motivos_nota_debito_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.motivos_nota_debito_id_seq OWNED BY public.motivos_nota_debito.id;


--
-- Name: permiso_rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permiso_rol (
    inquilino_id bigint NOT NULL,
    rol_id bigint NOT NULL,
    permiso_id bigint NOT NULL
);

ALTER TABLE ONLY public.permiso_rol FORCE ROW LEVEL SECURITY;


--
-- Name: permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permisos (
    id smallint NOT NULL,
    codigo character varying(60) NOT NULL,
    modulo character varying(30) NOT NULL,
    descripcion character varying(255) NOT NULL
);


--
-- Name: permisos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permisos_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permisos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permisos_id_seq OWNED BY public.permisos.id;


--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- Name: planes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planes (
    id bigint NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(60) NOT NULL,
    precio_mensual numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    max_sucursales integer,
    max_usuarios integer,
    max_comprobantes_mes integer,
    modulos_incluidos jsonb DEFAULT '[]'::jsonb NOT NULL,
    es_activo boolean DEFAULT true NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone
);


--
-- Name: planes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planes_id_seq OWNED BY public.planes.id;


--
-- Name: producto_estacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producto_estacion (
    inquilino_id bigint NOT NULL,
    producto_id bigint NOT NULL,
    estacion_preparacion_id bigint NOT NULL
);

ALTER TABLE ONLY public.producto_estacion FORCE ROW LEVEL SECURITY;


--
-- Name: producto_modificador_grupo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producto_modificador_grupo (
    inquilino_id bigint NOT NULL,
    producto_id bigint NOT NULL,
    modificador_grupo_id bigint NOT NULL,
    orden smallint DEFAULT '0'::smallint NOT NULL
);

ALTER TABLE ONLY public.producto_modificador_grupo FORCE ROW LEVEL SECURITY;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    categoria_id bigint,
    tipo character varying(10) NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(120) NOT NULL,
    descripcion character varying(255),
    unidad_medida_id bigint NOT NULL,
    precio_venta numeric(12,2),
    tipo_afectacion_igv_id bigint NOT NULL,
    es_vendible boolean DEFAULT true NOT NULL,
    controla_stock boolean DEFAULT false NOT NULL,
    imagen_ruta character varying(255),
    es_activo boolean DEFAULT true NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    eliminado_en timestamp(0) with time zone,
    CONSTRAINT productos_precio_check CHECK (((precio_venta IS NULL) OR (precio_venta >= (0)::numeric))),
    CONSTRAINT productos_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['PLATO'::character varying, 'BEBIDA'::character varying, 'INSUMO'::character varying])::text[]))),
    CONSTRAINT productos_vendible_check CHECK (((NOT es_vendible) OR (precio_venta IS NOT NULL)))
);

ALTER TABLE ONLY public.productos FORCE ROW LEVEL SECURITY;


--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.productos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: registros_prueba; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registros_prueba (
    id bigint NOT NULL,
    ruc character(11) NOT NULL,
    razon_social character varying(255) NOT NULL,
    nombre_comercial character varying(255) NOT NULL,
    slug character varying(63) NOT NULL,
    nombre_contacto character varying(255) NOT NULL,
    correo character varying(255) NOT NULL,
    telefono character varying(15),
    contrasena_hash character varying(255),
    token_hash character(64),
    token_expira_en timestamp(0) with time zone,
    verificado_en timestamp(0) with time zone,
    inquilino_id bigint,
    ip inet,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    CONSTRAINT registros_prueba_ruc_check CHECK ((ruc ~ '^(10|15|17|20)[0-9]{9}$'::text))
);


--
-- Name: registros_prueba_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.registros_prueba_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: registros_prueba_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.registros_prueba_id_seq OWNED BY public.registros_prueba.id;


--
-- Name: rol_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rol_usuario (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    rol_id bigint NOT NULL,
    sucursal_id bigint,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone
);

ALTER TABLE ONLY public.rol_usuario FORCE ROW LEVEL SECURITY;


--
-- Name: rol_usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rol_usuario_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rol_usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rol_usuario_id_seq OWNED BY public.rol_usuario.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    nombre character varying(60) NOT NULL,
    descripcion character varying(255),
    es_sistema boolean DEFAULT false NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone
);

ALTER TABLE ONLY public.roles FORCE ROW LEVEL SECURITY;


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: salones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salones (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    sucursal_id bigint NOT NULL,
    nombre character varying(60) NOT NULL,
    ancho integer DEFAULT 1000 NOT NULL,
    alto integer DEFAULT 700 NOT NULL,
    orden smallint DEFAULT '0'::smallint NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    es_activo boolean DEFAULT true NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    eliminado_en timestamp(0) with time zone,
    CONSTRAINT salones_dimensiones_check CHECK (((ancho > 0) AND (alto > 0)))
);

ALTER TABLE ONLY public.salones FORCE ROW LEVEL SECURITY;


--
-- Name: salones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salones_id_seq OWNED BY public.salones.id;


--
-- Name: series_comprobante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.series_comprobante (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    empresa_id bigint NOT NULL,
    sucursal_id bigint NOT NULL,
    tipo_comprobante_id bigint NOT NULL,
    serie character(4) NOT NULL,
    ultimo_correlativo bigint DEFAULT '0'::bigint NOT NULL,
    es_activa boolean DEFAULT true NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    CONSTRAINT series_formato_check CHECK ((serie ~ '^[BF][A-Z0-9]{3}$'::text))
);

ALTER TABLE ONLY public.series_comprobante FORCE ROW LEVEL SECURITY;


--
-- Name: series_comprobante_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.series_comprobante_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: series_comprobante_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.series_comprobante_id_seq OWNED BY public.series_comprobante.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


--
-- Name: sucursales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sucursales (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    empresa_id bigint NOT NULL,
    nombre character varying(255) NOT NULL,
    direccion character varying(255),
    ubigeo_id bigint,
    codigo_establecimiento character(4) DEFAULT '0000'::bpchar NOT NULL,
    es_principal boolean DEFAULT false NOT NULL,
    es_activa boolean DEFAULT true NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    eliminado_en timestamp(0) with time zone,
    CONSTRAINT sucursales_codigo_establecimiento_check CHECK ((codigo_establecimiento ~ '^[0-9]{4}$'::text))
);

ALTER TABLE ONLY public.sucursales FORCE ROW LEVEL SECURITY;


--
-- Name: sucursales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sucursales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sucursales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sucursales_id_seq OWNED BY public.sucursales.id;


--
-- Name: suscripciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suscripciones (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    plan_id bigint NOT NULL,
    estado character varying(20) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_vencimiento date NOT NULL,
    dias_gracia smallint DEFAULT '15'::smallint NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    CONSTRAINT suscripciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['PRUEBA'::character varying, 'ACTIVA'::character varying, 'MOROSA'::character varying, 'SUSPENDIDA'::character varying, 'CANCELADA'::character varying])::text[]))),
    CONSTRAINT suscripciones_fechas_check CHECK ((fecha_vencimiento >= fecha_inicio))
);

ALTER TABLE ONLY public.suscripciones FORCE ROW LEVEL SECURITY;


--
-- Name: suscripciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suscripciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suscripciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suscripciones_id_seq OWNED BY public.suscripciones.id;


--
-- Name: tasas_igv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasas_igv (
    id smallint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(120) NOT NULL,
    tasa numeric(5,2) NOT NULL,
    vigente_desde date NOT NULL,
    vigente_hasta date
);


--
-- Name: tasas_igv_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tasas_igv_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasas_igv_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasas_igv_id_seq OWNED BY public.tasas_igv.id;


--
-- Name: tipos_afectacion_igv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_afectacion_igv (
    id smallint NOT NULL,
    codigo character varying(2) NOT NULL,
    nombre character varying(120) NOT NULL,
    es_activo boolean DEFAULT true NOT NULL
);


--
-- Name: tipos_afectacion_igv_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipos_afectacion_igv_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipos_afectacion_igv_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_afectacion_igv_id_seq OWNED BY public.tipos_afectacion_igv.id;


--
-- Name: tipos_comprobante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_comprobante (
    id smallint NOT NULL,
    codigo character varying(2) NOT NULL,
    nombre character varying(120) NOT NULL,
    es_activo boolean DEFAULT true NOT NULL
);


--
-- Name: tipos_comprobante_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipos_comprobante_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipos_comprobante_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_comprobante_id_seq OWNED BY public.tipos_comprobante.id;


--
-- Name: tipos_documento_identidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_documento_identidad (
    id smallint NOT NULL,
    codigo character varying(1) NOT NULL,
    nombre character varying(120) NOT NULL,
    es_activo boolean DEFAULT true NOT NULL
);


--
-- Name: tipos_documento_identidad_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipos_documento_identidad_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipos_documento_identidad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_documento_identidad_id_seq OWNED BY public.tipos_documento_identidad.id;


--
-- Name: ubigeos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ubigeos (
    id smallint NOT NULL,
    codigo character(6) NOT NULL,
    departamento character varying(60) NOT NULL,
    provincia character varying(60) NOT NULL,
    distrito character varying(60) NOT NULL
);


--
-- Name: ubigeos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ubigeos_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ubigeos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ubigeos_id_seq OWNED BY public.ubigeos.id;


--
-- Name: unidades_medida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades_medida (
    id smallint NOT NULL,
    codigo character varying(3) NOT NULL,
    nombre character varying(120) NOT NULL,
    es_activo boolean DEFAULT true NOT NULL
);


--
-- Name: unidades_medida_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unidades_medida_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unidades_medida_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unidades_medida_id_seq OWNED BY public.unidades_medida.id;


--
-- Name: uso_inquilino; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uso_inquilino (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    periodo character(7) NOT NULL,
    comprobantes_emitidos integer DEFAULT 0 NOT NULL,
    sucursales_activas integer DEFAULT 0 NOT NULL,
    usuarios_activos integer DEFAULT 0 NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    CONSTRAINT uso_inquilino_periodo_check CHECK ((periodo ~ '^[0-9]{4}-[0-9]{2}$'::text))
);

ALTER TABLE ONLY public.uso_inquilino FORCE ROW LEVEL SECURITY;


--
-- Name: uso_inquilino_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.uso_inquilino_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: uso_inquilino_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.uso_inquilino_id_seq OWNED BY public.uso_inquilino.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id bigint NOT NULL,
    inquilino_id bigint NOT NULL,
    nombre character varying(255) NOT NULL,
    correo character varying(255) NOT NULL,
    contrasena character varying(255) NOT NULL,
    es_activo boolean DEFAULT true NOT NULL,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone,
    eliminado_en timestamp(0) with time zone,
    pin_hash character varying(255)
);

ALTER TABLE ONLY public.usuarios FORCE ROW LEVEL SECURITY;


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: administradores_plataforma id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administradores_plataforma ALTER COLUMN id SET DEFAULT nextval('public.administradores_plataforma_id_seq'::regclass);


--
-- Name: bitacora_plataforma id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_plataforma ALTER COLUMN id SET DEFAULT nextval('public.bitacora_plataforma_id_seq'::regclass);


--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: certificados_digitales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificados_digitales ALTER COLUMN id SET DEFAULT nextval('public.certificados_digitales_id_seq'::regclass);


--
-- Name: elementos_plano id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elementos_plano ALTER COLUMN id SET DEFAULT nextval('public.elementos_plano_id_seq'::regclass);


--
-- Name: empresas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- Name: estaciones_preparacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estaciones_preparacion ALTER COLUMN id SET DEFAULT nextval('public.estaciones_preparacion_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: inquilinos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquilinos ALTER COLUMN id SET DEFAULT nextval('public.inquilinos_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: mesas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas ALTER COLUMN id SET DEFAULT nextval('public.mesas_id_seq'::regclass);


--
-- Name: metodos_pago id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago ALTER COLUMN id SET DEFAULT nextval('public.metodos_pago_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: modificador_grupos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificador_grupos ALTER COLUMN id SET DEFAULT nextval('public.modificador_grupos_id_seq'::regclass);


--
-- Name: modificadores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificadores ALTER COLUMN id SET DEFAULT nextval('public.modificadores_id_seq'::regclass);


--
-- Name: monedas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monedas ALTER COLUMN id SET DEFAULT nextval('public.monedas_id_seq'::regclass);


--
-- Name: motivos_nota_credito id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_nota_credito ALTER COLUMN id SET DEFAULT nextval('public.motivos_nota_credito_id_seq'::regclass);


--
-- Name: motivos_nota_debito id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_nota_debito ALTER COLUMN id SET DEFAULT nextval('public.motivos_nota_debito_id_seq'::regclass);


--
-- Name: permisos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos ALTER COLUMN id SET DEFAULT nextval('public.permisos_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: planes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes ALTER COLUMN id SET DEFAULT nextval('public.planes_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Name: registros_prueba id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_prueba ALTER COLUMN id SET DEFAULT nextval('public.registros_prueba_id_seq'::regclass);


--
-- Name: rol_usuario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_usuario ALTER COLUMN id SET DEFAULT nextval('public.rol_usuario_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: salones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salones ALTER COLUMN id SET DEFAULT nextval('public.salones_id_seq'::regclass);


--
-- Name: series_comprobante id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_comprobante ALTER COLUMN id SET DEFAULT nextval('public.series_comprobante_id_seq'::regclass);


--
-- Name: sucursales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales ALTER COLUMN id SET DEFAULT nextval('public.sucursales_id_seq'::regclass);


--
-- Name: suscripciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripciones ALTER COLUMN id SET DEFAULT nextval('public.suscripciones_id_seq'::regclass);


--
-- Name: tasas_igv id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasas_igv ALTER COLUMN id SET DEFAULT nextval('public.tasas_igv_id_seq'::regclass);


--
-- Name: tipos_afectacion_igv id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_afectacion_igv ALTER COLUMN id SET DEFAULT nextval('public.tipos_afectacion_igv_id_seq'::regclass);


--
-- Name: tipos_comprobante id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_comprobante ALTER COLUMN id SET DEFAULT nextval('public.tipos_comprobante_id_seq'::regclass);


--
-- Name: tipos_documento_identidad id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_documento_identidad ALTER COLUMN id SET DEFAULT nextval('public.tipos_documento_identidad_id_seq'::regclass);


--
-- Name: ubigeos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubigeos ALTER COLUMN id SET DEFAULT nextval('public.ubigeos_id_seq'::regclass);


--
-- Name: unidades_medida id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida ALTER COLUMN id SET DEFAULT nextval('public.unidades_medida_id_seq'::regclass);


--
-- Name: uso_inquilino id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uso_inquilino ALTER COLUMN id SET DEFAULT nextval('public.uso_inquilino_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: administradores_plataforma administradores_plataforma_correo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administradores_plataforma
    ADD CONSTRAINT administradores_plataforma_correo_unique UNIQUE (correo);


--
-- Name: administradores_plataforma administradores_plataforma_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administradores_plataforma
    ADD CONSTRAINT administradores_plataforma_pkey PRIMARY KEY (id);


--
-- Name: bitacora_plataforma bitacora_plataforma_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_plataforma
    ADD CONSTRAINT bitacora_plataforma_pkey PRIMARY KEY (id);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: categoria_estacion categoria_estacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria_estacion
    ADD CONSTRAINT categoria_estacion_pkey PRIMARY KEY (categoria_id);


--
-- Name: categorias categorias_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: certificados_digitales certificados_digitales_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificados_digitales
    ADD CONSTRAINT certificados_digitales_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: certificados_digitales certificados_digitales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificados_digitales
    ADD CONSTRAINT certificados_digitales_pkey PRIMARY KEY (id);


--
-- Name: elementos_plano elementos_plano_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elementos_plano
    ADD CONSTRAINT elementos_plano_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: elementos_plano elementos_plano_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elementos_plano
    ADD CONSTRAINT elementos_plano_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: empresas empresas_inquilino_id_ruc_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_inquilino_id_ruc_unique UNIQUE (inquilino_id, ruc);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: estaciones_preparacion estaciones_preparacion_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estaciones_preparacion
    ADD CONSTRAINT estaciones_preparacion_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: estaciones_preparacion estaciones_preparacion_inquilino_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estaciones_preparacion
    ADD CONSTRAINT estaciones_preparacion_inquilino_id_nombre_unique UNIQUE (inquilino_id, nombre);


--
-- Name: estaciones_preparacion estaciones_preparacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estaciones_preparacion
    ADD CONSTRAINT estaciones_preparacion_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: inquilinos inquilinos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquilinos
    ADD CONSTRAINT inquilinos_pkey PRIMARY KEY (id);


--
-- Name: inquilinos inquilinos_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquilinos
    ADD CONSTRAINT inquilinos_slug_unique UNIQUE (slug);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: mesas mesas_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: mesas mesas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_pkey PRIMARY KEY (id);


--
-- Name: mesas mesas_salon_id_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_salon_id_codigo_unique UNIQUE (salon_id, codigo);


--
-- Name: metodos_pago metodos_pago_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_codigo_unique UNIQUE (codigo);


--
-- Name: metodos_pago metodos_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: modificador_grupos modificador_grupos_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificador_grupos
    ADD CONSTRAINT modificador_grupos_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: modificador_grupos modificador_grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificador_grupos
    ADD CONSTRAINT modificador_grupos_pkey PRIMARY KEY (id);


--
-- Name: modificadores modificadores_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificadores
    ADD CONSTRAINT modificadores_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: modificadores modificadores_modificador_grupo_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificadores
    ADD CONSTRAINT modificadores_modificador_grupo_id_nombre_unique UNIQUE (modificador_grupo_id, nombre);


--
-- Name: modificadores modificadores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificadores
    ADD CONSTRAINT modificadores_pkey PRIMARY KEY (id);


--
-- Name: monedas monedas_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monedas
    ADD CONSTRAINT monedas_codigo_unique UNIQUE (codigo);


--
-- Name: monedas monedas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monedas
    ADD CONSTRAINT monedas_pkey PRIMARY KEY (id);


--
-- Name: motivos_nota_credito motivos_nota_credito_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_nota_credito
    ADD CONSTRAINT motivos_nota_credito_codigo_unique UNIQUE (codigo);


--
-- Name: motivos_nota_credito motivos_nota_credito_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_nota_credito
    ADD CONSTRAINT motivos_nota_credito_pkey PRIMARY KEY (id);


--
-- Name: motivos_nota_debito motivos_nota_debito_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_nota_debito
    ADD CONSTRAINT motivos_nota_debito_codigo_unique UNIQUE (codigo);


--
-- Name: motivos_nota_debito motivos_nota_debito_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_nota_debito
    ADD CONSTRAINT motivos_nota_debito_pkey PRIMARY KEY (id);


--
-- Name: permiso_rol permiso_rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_rol
    ADD CONSTRAINT permiso_rol_pkey PRIMARY KEY (rol_id, permiso_id);


--
-- Name: permisos permisos_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_codigo_unique UNIQUE (codigo);


--
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: planes planes_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes
    ADD CONSTRAINT planes_codigo_unique UNIQUE (codigo);


--
-- Name: planes planes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planes
    ADD CONSTRAINT planes_pkey PRIMARY KEY (id);


--
-- Name: producto_estacion producto_estacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_estacion
    ADD CONSTRAINT producto_estacion_pkey PRIMARY KEY (producto_id);


--
-- Name: producto_modificador_grupo producto_modificador_grupo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_modificador_grupo
    ADD CONSTRAINT producto_modificador_grupo_pkey PRIMARY KEY (producto_id, modificador_grupo_id);


--
-- Name: productos productos_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: registros_prueba registros_prueba_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_prueba
    ADD CONSTRAINT registros_prueba_pkey PRIMARY KEY (id);


--
-- Name: rol_usuario rol_usuario_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_usuario
    ADD CONSTRAINT rol_usuario_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: rol_usuario rol_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_usuario
    ADD CONSTRAINT rol_usuario_pkey PRIMARY KEY (id);


--
-- Name: roles roles_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: roles roles_inquilino_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_inquilino_id_nombre_unique UNIQUE (inquilino_id, nombre);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: salones salones_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salones
    ADD CONSTRAINT salones_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: salones salones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salones
    ADD CONSTRAINT salones_pkey PRIMARY KEY (id);


--
-- Name: series_comprobante series_comprobante_empresa_id_tipo_comprobante_id_serie_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_comprobante
    ADD CONSTRAINT series_comprobante_empresa_id_tipo_comprobante_id_serie_unique UNIQUE (empresa_id, tipo_comprobante_id, serie);


--
-- Name: series_comprobante series_comprobante_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_comprobante
    ADD CONSTRAINT series_comprobante_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: series_comprobante series_comprobante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_comprobante
    ADD CONSTRAINT series_comprobante_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sucursales sucursales_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: sucursales sucursales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_pkey PRIMARY KEY (id);


--
-- Name: suscripciones suscripciones_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripciones
    ADD CONSTRAINT suscripciones_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: suscripciones suscripciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripciones
    ADD CONSTRAINT suscripciones_pkey PRIMARY KEY (id);


--
-- Name: tasas_igv tasas_igv_codigo_vigente_desde_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasas_igv
    ADD CONSTRAINT tasas_igv_codigo_vigente_desde_unique UNIQUE (codigo, vigente_desde);


--
-- Name: tasas_igv tasas_igv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasas_igv
    ADD CONSTRAINT tasas_igv_pkey PRIMARY KEY (id);


--
-- Name: tipos_afectacion_igv tipos_afectacion_igv_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_afectacion_igv
    ADD CONSTRAINT tipos_afectacion_igv_codigo_unique UNIQUE (codigo);


--
-- Name: tipos_afectacion_igv tipos_afectacion_igv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_afectacion_igv
    ADD CONSTRAINT tipos_afectacion_igv_pkey PRIMARY KEY (id);


--
-- Name: tipos_comprobante tipos_comprobante_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_comprobante
    ADD CONSTRAINT tipos_comprobante_codigo_unique UNIQUE (codigo);


--
-- Name: tipos_comprobante tipos_comprobante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_comprobante
    ADD CONSTRAINT tipos_comprobante_pkey PRIMARY KEY (id);


--
-- Name: tipos_documento_identidad tipos_documento_identidad_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_documento_identidad
    ADD CONSTRAINT tipos_documento_identidad_codigo_unique UNIQUE (codigo);


--
-- Name: tipos_documento_identidad tipos_documento_identidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_documento_identidad
    ADD CONSTRAINT tipos_documento_identidad_pkey PRIMARY KEY (id);


--
-- Name: ubigeos ubigeos_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubigeos
    ADD CONSTRAINT ubigeos_codigo_unique UNIQUE (codigo);


--
-- Name: ubigeos ubigeos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubigeos
    ADD CONSTRAINT ubigeos_pkey PRIMARY KEY (id);


--
-- Name: unidades_medida unidades_medida_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida
    ADD CONSTRAINT unidades_medida_codigo_unique UNIQUE (codigo);


--
-- Name: unidades_medida unidades_medida_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades_medida
    ADD CONSTRAINT unidades_medida_pkey PRIMARY KEY (id);


--
-- Name: uso_inquilino uso_inquilino_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uso_inquilino
    ADD CONSTRAINT uso_inquilino_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: uso_inquilino uso_inquilino_inquilino_id_periodo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uso_inquilino
    ADD CONSTRAINT uso_inquilino_inquilino_id_periodo_unique UNIQUE (inquilino_id, periodo);


--
-- Name: uso_inquilino uso_inquilino_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uso_inquilino
    ADD CONSTRAINT uso_inquilino_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_inquilino_id_correo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_inquilino_id_correo_unique UNIQUE (inquilino_id, correo);


--
-- Name: usuarios usuarios_inquilino_id_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_inquilino_id_id_unique UNIQUE (inquilino_id, id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: bitacora_plataforma_inquilino_id_creado_en_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bitacora_plataforma_inquilino_id_creado_en_index ON public.bitacora_plataforma USING btree (inquilino_id, creado_en);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: categorias_nombre_unico; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categorias_nombre_unico ON public.categorias USING btree (inquilino_id, lower((nombre)::text)) WHERE (eliminado_en IS NULL);


--
-- Name: certificados_uno_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX certificados_uno_activo ON public.certificados_digitales USING btree (empresa_id) WHERE es_activo;


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: productos_codigo_unico; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX productos_codigo_unico ON public.productos USING btree (inquilino_id, codigo) WHERE (eliminado_en IS NULL);


--
-- Name: registros_prueba_correo_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registros_prueba_correo_index ON public.registros_prueba USING btree (correo);


--
-- Name: registros_prueba_ruc_verificado; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX registros_prueba_ruc_verificado ON public.registros_prueba USING btree (ruc) WHERE (verificado_en IS NOT NULL);


--
-- Name: registros_prueba_token_hash_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registros_prueba_token_hash_index ON public.registros_prueba USING btree (token_hash);


--
-- Name: rol_usuario_unico; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX rol_usuario_unico ON public.rol_usuario USING btree (usuario_id, rol_id, sucursal_id) NULLS NOT DISTINCT;


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: sucursales_una_principal; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sucursales_una_principal ON public.sucursales USING btree (inquilino_id) WHERE (es_principal AND (eliminado_en IS NULL));


--
-- Name: suscripciones_inquilino_id_fecha_vencimiento_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX suscripciones_inquilino_id_fecha_vencimiento_index ON public.suscripciones USING btree (inquilino_id, fecha_vencimiento);


--
-- Name: bitacora_plataforma bitacora_plataforma_administrador_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_plataforma
    ADD CONSTRAINT bitacora_plataforma_administrador_id_foreign FOREIGN KEY (administrador_id) REFERENCES public.administradores_plataforma(id) ON DELETE RESTRICT;


--
-- Name: bitacora_plataforma bitacora_plataforma_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_plataforma
    ADD CONSTRAINT bitacora_plataforma_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE SET NULL;


--
-- Name: categoria_estacion categoria_estacion_inquilino_id_categoria_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria_estacion
    ADD CONSTRAINT categoria_estacion_inquilino_id_categoria_id_foreign FOREIGN KEY (inquilino_id, categoria_id) REFERENCES public.categorias(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: categoria_estacion categoria_estacion_inquilino_id_estacion_preparacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria_estacion
    ADD CONSTRAINT categoria_estacion_inquilino_id_estacion_preparacion_id_foreign FOREIGN KEY (inquilino_id, estacion_preparacion_id) REFERENCES public.estaciones_preparacion(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: categoria_estacion categoria_estacion_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria_estacion
    ADD CONSTRAINT categoria_estacion_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: categorias categorias_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: certificados_digitales certificados_digitales_inquilino_id_empresa_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificados_digitales
    ADD CONSTRAINT certificados_digitales_inquilino_id_empresa_id_foreign FOREIGN KEY (inquilino_id, empresa_id) REFERENCES public.empresas(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: certificados_digitales certificados_digitales_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificados_digitales
    ADD CONSTRAINT certificados_digitales_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: elementos_plano elementos_plano_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elementos_plano
    ADD CONSTRAINT elementos_plano_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: elementos_plano elementos_plano_inquilino_id_salon_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elementos_plano
    ADD CONSTRAINT elementos_plano_inquilino_id_salon_id_foreign FOREIGN KEY (inquilino_id, salon_id) REFERENCES public.salones(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: empresas empresas_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: empresas empresas_ubigeo_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_ubigeo_id_foreign FOREIGN KEY (ubigeo_id) REFERENCES public.ubigeos(id) ON DELETE RESTRICT;


--
-- Name: estaciones_preparacion estaciones_preparacion_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estaciones_preparacion
    ADD CONSTRAINT estaciones_preparacion_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: mesas mesas_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: mesas mesas_inquilino_id_salon_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_inquilino_id_salon_id_foreign FOREIGN KEY (inquilino_id, salon_id) REFERENCES public.salones(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: modificador_grupos modificador_grupos_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificador_grupos
    ADD CONSTRAINT modificador_grupos_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: modificadores modificadores_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificadores
    ADD CONSTRAINT modificadores_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: modificadores modificadores_inquilino_id_modificador_grupo_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modificadores
    ADD CONSTRAINT modificadores_inquilino_id_modificador_grupo_id_foreign FOREIGN KEY (inquilino_id, modificador_grupo_id) REFERENCES public.modificador_grupos(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: permiso_rol permiso_rol_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_rol
    ADD CONSTRAINT permiso_rol_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: permiso_rol permiso_rol_inquilino_id_rol_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_rol
    ADD CONSTRAINT permiso_rol_inquilino_id_rol_id_foreign FOREIGN KEY (inquilino_id, rol_id) REFERENCES public.roles(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: permiso_rol permiso_rol_permiso_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_rol
    ADD CONSTRAINT permiso_rol_permiso_id_foreign FOREIGN KEY (permiso_id) REFERENCES public.permisos(id) ON DELETE RESTRICT;


--
-- Name: producto_estacion producto_estacion_inquilino_id_estacion_preparacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_estacion
    ADD CONSTRAINT producto_estacion_inquilino_id_estacion_preparacion_id_foreign FOREIGN KEY (inquilino_id, estacion_preparacion_id) REFERENCES public.estaciones_preparacion(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: producto_estacion producto_estacion_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_estacion
    ADD CONSTRAINT producto_estacion_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: producto_estacion producto_estacion_inquilino_id_producto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_estacion
    ADD CONSTRAINT producto_estacion_inquilino_id_producto_id_foreign FOREIGN KEY (inquilino_id, producto_id) REFERENCES public.productos(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: producto_modificador_grupo producto_modificador_grupo_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_modificador_grupo
    ADD CONSTRAINT producto_modificador_grupo_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: producto_modificador_grupo producto_modificador_grupo_inquilino_id_modificador_grupo_id_fo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_modificador_grupo
    ADD CONSTRAINT producto_modificador_grupo_inquilino_id_modificador_grupo_id_fo FOREIGN KEY (inquilino_id, modificador_grupo_id) REFERENCES public.modificador_grupos(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: producto_modificador_grupo producto_modificador_grupo_inquilino_id_producto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_modificador_grupo
    ADD CONSTRAINT producto_modificador_grupo_inquilino_id_producto_id_foreign FOREIGN KEY (inquilino_id, producto_id) REFERENCES public.productos(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: productos productos_inquilino_id_categoria_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_inquilino_id_categoria_id_foreign FOREIGN KEY (inquilino_id, categoria_id) REFERENCES public.categorias(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: productos productos_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: productos productos_tipo_afectacion_igv_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_tipo_afectacion_igv_id_foreign FOREIGN KEY (tipo_afectacion_igv_id) REFERENCES public.tipos_afectacion_igv(id) ON DELETE RESTRICT;


--
-- Name: productos productos_unidad_medida_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_unidad_medida_id_foreign FOREIGN KEY (unidad_medida_id) REFERENCES public.unidades_medida(id) ON DELETE RESTRICT;


--
-- Name: registros_prueba registros_prueba_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_prueba
    ADD CONSTRAINT registros_prueba_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE SET NULL;


--
-- Name: rol_usuario rol_usuario_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_usuario
    ADD CONSTRAINT rol_usuario_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: rol_usuario rol_usuario_inquilino_id_rol_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_usuario
    ADD CONSTRAINT rol_usuario_inquilino_id_rol_id_foreign FOREIGN KEY (inquilino_id, rol_id) REFERENCES public.roles(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: rol_usuario rol_usuario_inquilino_id_sucursal_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_usuario
    ADD CONSTRAINT rol_usuario_inquilino_id_sucursal_id_foreign FOREIGN KEY (inquilino_id, sucursal_id) REFERENCES public.sucursales(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: rol_usuario rol_usuario_inquilino_id_usuario_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_usuario
    ADD CONSTRAINT rol_usuario_inquilino_id_usuario_id_foreign FOREIGN KEY (inquilino_id, usuario_id) REFERENCES public.usuarios(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: roles roles_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: salones salones_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salones
    ADD CONSTRAINT salones_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: salones salones_inquilino_id_sucursal_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salones
    ADD CONSTRAINT salones_inquilino_id_sucursal_id_foreign FOREIGN KEY (inquilino_id, sucursal_id) REFERENCES public.sucursales(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: series_comprobante series_comprobante_inquilino_id_empresa_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_comprobante
    ADD CONSTRAINT series_comprobante_inquilino_id_empresa_id_foreign FOREIGN KEY (inquilino_id, empresa_id) REFERENCES public.empresas(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: series_comprobante series_comprobante_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_comprobante
    ADD CONSTRAINT series_comprobante_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: series_comprobante series_comprobante_inquilino_id_sucursal_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_comprobante
    ADD CONSTRAINT series_comprobante_inquilino_id_sucursal_id_foreign FOREIGN KEY (inquilino_id, sucursal_id) REFERENCES public.sucursales(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: series_comprobante series_comprobante_tipo_comprobante_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_comprobante
    ADD CONSTRAINT series_comprobante_tipo_comprobante_id_foreign FOREIGN KEY (tipo_comprobante_id) REFERENCES public.tipos_comprobante(id) ON DELETE RESTRICT;


--
-- Name: sucursales sucursales_inquilino_id_empresa_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_inquilino_id_empresa_id_foreign FOREIGN KEY (inquilino_id, empresa_id) REFERENCES public.empresas(inquilino_id, id) ON DELETE RESTRICT;


--
-- Name: sucursales sucursales_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: sucursales sucursales_ubigeo_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_ubigeo_id_foreign FOREIGN KEY (ubigeo_id) REFERENCES public.ubigeos(id) ON DELETE RESTRICT;


--
-- Name: suscripciones suscripciones_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripciones
    ADD CONSTRAINT suscripciones_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: suscripciones suscripciones_plan_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripciones
    ADD CONSTRAINT suscripciones_plan_id_foreign FOREIGN KEY (plan_id) REFERENCES public.planes(id) ON DELETE RESTRICT;


--
-- Name: uso_inquilino uso_inquilino_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uso_inquilino
    ADD CONSTRAINT uso_inquilino_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: usuarios usuarios_inquilino_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_inquilino_id_foreign FOREIGN KEY (inquilino_id) REFERENCES public.inquilinos(id) ON DELETE RESTRICT;


--
-- Name: categoria_estacion aislamiento_inquilino_categoria_estacion; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_categoria_estacion ON public.categoria_estacion USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: categorias aislamiento_inquilino_categorias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_categorias ON public.categorias USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: certificados_digitales aislamiento_inquilino_certificados_digitales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_certificados_digitales ON public.certificados_digitales USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: elementos_plano aislamiento_inquilino_elementos_plano; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_elementos_plano ON public.elementos_plano USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: empresas aislamiento_inquilino_empresas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_empresas ON public.empresas USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: estaciones_preparacion aislamiento_inquilino_estaciones_preparacion; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_estaciones_preparacion ON public.estaciones_preparacion USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: mesas aislamiento_inquilino_mesas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_mesas ON public.mesas USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: modificador_grupos aislamiento_inquilino_modificador_grupos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_modificador_grupos ON public.modificador_grupos USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: modificadores aislamiento_inquilino_modificadores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_modificadores ON public.modificadores USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: permiso_rol aislamiento_inquilino_permiso_rol; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_permiso_rol ON public.permiso_rol USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: producto_estacion aislamiento_inquilino_producto_estacion; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_producto_estacion ON public.producto_estacion USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: producto_modificador_grupo aislamiento_inquilino_producto_modificador_grupo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_producto_modificador_grupo ON public.producto_modificador_grupo USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: productos aislamiento_inquilino_productos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_productos ON public.productos USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: rol_usuario aislamiento_inquilino_rol_usuario; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_rol_usuario ON public.rol_usuario USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: roles aislamiento_inquilino_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_roles ON public.roles USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: salones aislamiento_inquilino_salones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_salones ON public.salones USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: series_comprobante aislamiento_inquilino_series_comprobante; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_series_comprobante ON public.series_comprobante USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: sucursales aislamiento_inquilino_sucursales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_sucursales ON public.sucursales USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: suscripciones aislamiento_inquilino_suscripciones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_suscripciones ON public.suscripciones USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: uso_inquilino aislamiento_inquilino_uso_inquilino; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_uso_inquilino ON public.uso_inquilino USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: usuarios aislamiento_inquilino_usuarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aislamiento_inquilino_usuarios ON public.usuarios USING ((inquilino_id = (NULLIF(current_setting('app.inquilino_actual'::text, true), ''::text))::bigint));


--
-- Name: categoria_estacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categoria_estacion ENABLE ROW LEVEL SECURITY;

--
-- Name: categorias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

--
-- Name: certificados_digitales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.certificados_digitales ENABLE ROW LEVEL SECURITY;

--
-- Name: elementos_plano; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.elementos_plano ENABLE ROW LEVEL SECURITY;

--
-- Name: empresas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

--
-- Name: estaciones_preparacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estaciones_preparacion ENABLE ROW LEVEL SECURITY;

--
-- Name: mesas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

--
-- Name: modificador_grupos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.modificador_grupos ENABLE ROW LEVEL SECURITY;

--
-- Name: modificadores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.modificadores ENABLE ROW LEVEL SECURITY;

--
-- Name: permiso_rol; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.permiso_rol ENABLE ROW LEVEL SECURITY;

--
-- Name: producto_estacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.producto_estacion ENABLE ROW LEVEL SECURITY;

--
-- Name: producto_modificador_grupo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.producto_modificador_grupo ENABLE ROW LEVEL SECURITY;

--
-- Name: productos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

--
-- Name: rol_usuario; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rol_usuario ENABLE ROW LEVEL SECURITY;

--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: salones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.salones ENABLE ROW LEVEL SECURITY;

--
-- Name: series_comprobante; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.series_comprobante ENABLE ROW LEVEL SECURITY;

--
-- Name: sucursales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;

--
-- Name: suscripciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;

--
-- Name: uso_inquilino; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.uso_inquilino ENABLE ROW LEVEL SECURITY;

--
-- Name: usuarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict KRWIJivzy6Pre4kBZqxtd4Pv0afYmX1ix9rCAhh0pxtM1EM5cYByG6XMW2HthDo

--
-- PostgreSQL database dump
--

\restrict CZwfAcf8q4Iq79gJdfeFg54imXMFbXCn8WC2iPXglTeqJJ5KzqxNVuhfuaAbdGJ

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2026_10_04_100000_create_inquilinos_table	1
5	2026_10_04_100100_create_usuarios_table	1
6	2026_10_04_204258_create_personal_access_tokens_table	1
7	2026_10_05_000100_create_catalogos_sunat	1
8	2026_10_05_000200_create_planes_suscripciones	1
9	2026_10_05_000300_create_empresas_sucursales	1
10	2026_10_05_000400_create_certificados_series	1
11	2026_10_05_000500_create_roles_permisos	1
12	2026_10_05_000600_create_categorias_productos	1
13	2026_10_05_000700_create_carta_restaurante	1
14	2026_10_05_000800_create_salones_mesas	1
15	2026_10_05_000900_create_registros_prueba	1
16	2026_10_05_001000_create_plataforma	2
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 16, true);


--
-- PostgreSQL database dump complete
--

\unrestrict CZwfAcf8q4Iq79gJdfeFg54imXMFbXCn8WC2iPXglTeqJJ5KzqxNVuhfuaAbdGJ

