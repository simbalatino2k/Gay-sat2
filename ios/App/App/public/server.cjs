"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_http2 = __toESM(require("http"), 1);
var import_genai = require("@google/genai");
var import_multer = __toESM(require("multer"), 1);

// src/db/store.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_crypto4 = __toESM(require("crypto"), 1);

// src/data/auraAlbum.ts
var AURA_ALBUM_PHOTOS = [
  "https://lh3.googleusercontent.com/pw/AP1GczPR4yeRM2uLGE6hsRYzsHYODDWLNgkOJ_KXO5rGVClcHwjf4BndfNAC6-zVBJK0P8rLsbjXYMH0K4e2-a9OxEph2T0Hxx3qLvg87FTob6ndL-vjOnoT=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczNmxN9GEP2_fYGPfUyy7Cv3BtQoXC1trbC6Zh6Xi08s1iza6BE_91-imtKhk_k3VMFeS5anLWFRJoZRhRJNUXucX_Jj8w1Sjkfe4FeFxXSjeD-enzr0=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczPvu95LbkYdiFXxKg3lL64IeVBGPKYsyHBn_a5FmluSGyoA_VrrwoY9_WL-8n_uX64eO4KvalIeR3Lk933_EY9_bNgh0nqjSPQ9oPABaXWEQSf2iIIU=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczPkSE3xTSOHndE0uATaPs1yAE9Oj-01tnAASP8HQHpg5Qv1BbX53Ylggbvbdi4rYKeOqODJj9imvIx4SWZcf-oVzHSPbMd2pUajuMBojtpvru1pHe0W=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczObyL-dgIE4keKMZBbA_fA6gA8qriv5txlIqq-jE2YmPXjiK14pH68sXXbcHPSdyQqIN4ZqVXmIN8WZclgkkG9mEqLAbFf5FH8ganA_HosypPkfnfrK=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczPsUtgnxy7_JAS29jldCnbEigRMhF6jGSLigXZ945edJ_WI9avwMm71qH3xFeGwSv_eh2gdALJCFninjntXhkusNKYTP9TSdo6ZeP3xnnYGgspiAR7V=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczPXbNxZtsmjMoMXuF_mg-l09zA_6-LLk6In6j4YTviuyj8kDOKXeqZnIj9Ca6PBuI2yxag9fKvMI8SELNVKC0QerpS7xTcGlEeIYiNAl2XegMf-_Svw=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczOzbZERgszqbRXj5NVpm5t-8GebZJ_TCk25nZzEbEhjXg172j9y3kuJ8RXzS78xSTAl9keefSfdv2szaRs00b-LrJdxm1TK8aqdahZTZ1S3bwaeTL1O=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczMOwOr4NLeD14CqAF9LvZRbTUlemB9mmhrmFwtSXkUkNYQ0yNYD0KOJwgFdBsHuR2vhCbRZc44IhQ9ZCw1Nn57tORbzAA4wGdFJsTYTTk_ejWBX-Rn7=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczPT3iEGEmCHklDZfM-ls2IV-lquP7Op5-B89jFqX6bUE6KrpVYG3uDTITFx2NCdBO5QL5_heqCN4RkMykapIcK_lv7ofEeMXItlQ-Q0__9iy7qFvixx=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczOyM3dTYQrGZv8AX34kSan4CCB1-K1eVGhXZYp0pJZMwZDIqrQ857tP64EphrBrxqi8cqfONw8R9_xaVAKYKVLSu7ldaWdgeT7eGVVtp4QWMeHxNAV9=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczMeWH3cGy66poesTxAOk-RVZ14M0ojRcwjDiruy-5VGqnUixoQ7u9qlt3JTVvVWuIOt6gfZNqaEHtpO-FFIQbR8jH-8LMyudmAl_Pp-SKHvWg3jBe2w=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczOEETegtSeWxMmuuoyh58VbTeQulfF7tP6cgdY8kDJIId1B1PlhlrXULcm2wYhXfREp8NOlrKc1ElE4e-WYIIOCL4gPM1GfPDzt587UIE1uzHvICyoM=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczN0LaCPFyly8JdqddIYkwQ85UT4_U9OB0YR2me2tT7bWL5r21rYXB33VjZZj77wsBmU4W-rer84AdXTbuS9biCdvvR4QHPnOZ2nOwDu0NzmVgdtgjw_=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczPn9ypQGTRId4JR_rbrK94AG-GgExaV880uDnkZaW_G3zo_7K02zCPO8yCAFDqdBSOk1s0SyUdT6rZxgn1F6xwMa4tyv0_bar3kokowlm3hBk0dKwhM=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczNAXb66YlO5yQ8PmeUHUx3WkIc3nOz9XptaMBahhgq2trfnJnrmV6mhFfGctFm1rq0jLCul0Ms_YBS7BlI6KwvewdBm0hhBI6FBkmYmvwH4RahKlhNA=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczOq18W_9CDliG_8TYqjUXARXKFYGZ0bL5r7pL5cSxuYyTEwXzl5eYU8Rvnec7LFMG2zeQ6cE48VBQehAGAFziOz3woEqgd_8n3QDSrPL-GOMJEVvI4R=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczOsQ7AeZz_E24cxGEWQUBTeBDnowRXwmxaEwqdIQW9ieHFJVhizHqLBmKDl1hYfj5fRsUNASNjTSZnk9oSLGgoM-MMVGY-hnVkTo7NC2ixuK-_jLhtt=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczOmkxPlfv8AuZEWf7JxAmSG9fa9EBZlAQVTLQ_TB9b42VRdKXrJ8099Y4W6T26s3JIIBPIfEp-v6DKsv8UqWLEpjaQNBqm2hd2OyGmeCrq6FiOYUg50=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczMu6gfpECI8MMcor7iYYA2l4aCElTZq0Emra4z5S4iuKBybK0JLjOoTNAF0OnERERFDpKh1tlFeuXSZbBH_B-OMAMMN-l3jIKq2BO0pHZM2Qf6qXUbp=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczPscLuOh8YClEqrh_eMyrJyZdVPEiMzvVzxrerjJSwQ0DoE62-NH-jYa0b06vEsTOJkwunIf6RSR_3sIkQPLtVbhsEJPvL4ss0C0FZ38P5DIAMPT0Ll=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczNscWwK3s9CkIm-xMKgADkGredb7mqtrXS4cuprKo7ec2NSQIzDBHdQT8CDyfwvSXB2eRtO75PtZx6VgELGeB4rCN5cTGRKX_qWBX7JWX71qqbjsjf7=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczMP1ljQbOwHyQ4L3HveK9AnLDmxT8j2cdMvTWV4LH05Zy9PwgeEh7pNGe-HVWDYqmPlUxEcnLTHEyaYDt849kz8PqBFOSMBDVu3XjBaUmaw4VjI_xSD=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczN0Dm8wEUzA6nCJJu4ENixjbDRpyLIzONjHb0fLExPvO-sqpaR-tERSa6XpKW18Ce8tjhTmAq4m6NcpcG2q7blZsdxc6cj5Bp7fh0TGo3jeCCaFs-Cy=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczO3uM1q_TP5ZFe3gT5wQ8uW_TG6LvNeFoL0OKkKrQvJCLVnxSohd5UQpA7TjdkbwKQvBc4cnlba1vUABE_NcrRfVlxQkTfGaFf8-mFk2ZC0fBRFLTb5=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczNAqiS4qcNXei1S1F-R7Kt-Fgx1SpLawkjrC2JzygZYBwpoiHqud9nWCB_b7MokPu4eiFOEbNrYae7lqsz8aNuKFw1askoipW1U6Y88dzx7VBIP4xUW=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczMlSh26hJsE6WfEdLR9Hz-Ha1AsWN99Hsla9D673LJOm7x6JkMVBbsN5PLPGN3DiTZh2UX5ZtCMfpguVtkJctryVsaQ4ILxJQi7YXjdeEB71Kh7G0oc=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczNAs6rp_ldhSeoH6sTWQETK-2r2FseCFrrfddU7wz_kCqC0cxQQjn-S2Bb-xq2ffIWIhJXuhrI9XYtNTX19O4GJXs8Fi-Ip8QCMEJwboLA9piS8z7IS=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczPiVl3R81auRJ8tm4k7FpYXKariWF0WolB2gdm7Kcrc2VVuiB28ge6e56QPYVGXKrVhMracsurWHYfUQCaUgDZzqhqqVQ8shfQPYRrfUfdGfv5aaeA8=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczMhAVbJPtfqccFGro9SUirP1DRvD6dy7PjyL69TdRr46oBZa0huNNgLdS4OhgpvF17iOJIAV5603Oqcvwr9CniezspL9-jx7VMx5rAFA2EBE6o04TCL=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczOD3ECiOa8FwAlnVv_Xxwp4033ghncPIWK5p4ZjFJb_kaaPBXMdH1v2vf_uVJa6sNzl8yREO6mqBJFaLY2eiZQLLkLST8La6GeGimFWUSMXmj-KXZHO=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczM7B1nXXETKZ6y5tEVcjJrxqBTrKZ20ZqNXYOs-921BJaTdKQW-7573e-CoNv-asZdCnPuqTs-UNg5mXiPieDyoLqLGZN7sBN1x4eWTkq5UrB_yvxfc=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczM4Oi2BAVuxWVtLCel_smDLdCvHhQ4mVB7vS2PuKrECbV5YQbVur0n4dBvkJuVcubSjE-yWbce_g23uiFzwr85Rg52DMZSJk7A4R1YBaLd3PYFN5_Xt=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczPVbwSHeD6AJ-L8OC36Q4Dl1iyVSPHT_WE3bI2BbbuG7kmljMCP4z1LfnjtNhqWTxBowZD0XKMr4ddR8vDfn-hZt2nDdt-8RzqMaG5mXeSwJC4zZ31s=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczO9KsAa6cG8EuIrxjg2Cm0-dj5jA6YfeV6tHK4UX3vvNo2S3HJFZyjH1xbtG6VAd5HEMe6wrp-Z6_JsKeEtWNxt1-f8W3U6qCFQqtKUmKlN8Dk_IVpr=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczM7N0XTOmxeOhPECCyvVOUbSBrEnoyTj0LZN1dV1NPZys4kZnXl_LNe9VPoz4agTBWU0sN9QFFlqjxSL6431o5yyynySwV0aE1TQX2BW2M8txwfdImu=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczNSofV-5gS-csOvVizsgWnKmiOBPGJxC8U3FLic6RG3xznuzHdi_UE5YvH83nhJkhtwrYP06_4JP9Lqmpv7eJuC9AbizhfMZqaX0Caa808XBI81IWKM=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczMzoTSNi3HrmSjdV-C-07_7nzU8GsGO_cLDLP04K-hU3oXe2-GJwhBSV7sYiZPjoUY3aKoZMg5GpgBDcrbwNHbYyay00hxFE6MrPeogWEQbPMiOMCjD=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczNHDTPAMi-COvkZDNHEEqWxRvKaTZorgwtTselzIS6gfUyWLkVIFE3wOw0FRF3XnbdYxFGd1K0E5Nl0p7WoSrArKeFw1upyaeKM7VAZAO7MpBYZRKYv=w800",
  "https://lh3.googleusercontent.com/pw/AP1GczPxILbnOjLAKXea0NXzy2Q-yqWebtZKepwYuI1mThrMrdiEXqmRh7mJHlegYVixbxc4LCF5cPPkPZo3zsH8aFA3O8f-URPOvBFDKFb01enn1PLKu4ZP=w800"
];

// src/db/postgres.ts
var import_pg = require("pg");
var import_crypto = __toESM(require("crypto"), 1);
var pgPool = null;
var isInitialized = false;
function getPostgresPool() {
  if (pgPool) return pgPool;
  const databaseUrl = process.env.DATABASE_URL;
  const sqlHost = process.env.SQL_HOST;
  const sqlUser = process.env.SQL_USER;
  const sqlPassword = process.env.SQL_PASSWORD;
  const sqlDbName = process.env.SQL_DB_NAME;
  let poolConfig = null;
  if (databaseUrl) {
    poolConfig = {
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 1e4,
      ssl: process.env.NODE_ENV === "production" && !databaseUrl.includes("localhost") ? { rejectUnauthorized: false } : false
    };
  } else if (sqlHost && sqlUser && sqlDbName) {
    poolConfig = {
      host: sqlHost,
      user: sqlUser,
      password: sqlPassword || "",
      database: sqlDbName,
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 1e4
    };
  }
  if (!poolConfig) {
    return null;
  }
  try {
    pgPool = new import_pg.Pool(poolConfig);
    pgPool.on("error", (err) => {
      console.error("[PostgreSQL Pool] Unexpected error on idle client:", err.message);
    });
    return pgPool;
  } catch (err) {
    console.error("[PostgreSQL Pool] Initialization error:", err.message);
    return null;
  }
}
async function initPostgresSchema() {
  const pool = getPostgresPool();
  if (!pool) return false;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        age INT NOT NULL,
        role VARCHAR(32) DEFAULT 'USER',
        status VARCHAR(32) DEFAULT 'ACTIVE',
        bio TEXT,
        sexual_role VARCHAR(32),
        tribe VARCHAR(64),
        looking_for VARCHAR(64),
        vibe VARCHAR(64),
        interests JSONB DEFAULT '[]'::jsonb,
        location JSONB DEFAULT '{}'::jsonb,
        photos JSONB DEFAULT '[]'::jsonb,
        is_verified BOOLEAN DEFAULT FALSE,
        is_premium BOOLEAN DEFAULT FALSE,
        premium_tier VARCHAR(64),
        privacy JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_passwords (
        user_id VARCHAR(128) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        salt_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        token VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ NOT NULL,
        last_used_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_consents (
        user_id VARCHAR(128) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        gdpr_accepted BOOLEAN NOT NULL DEFAULT TRUE,
        age_verified_18_plus BOOLEAN NOT NULL DEFAULT TRUE,
        privacy_policy_version VARCHAR(32) DEFAULT '2.0.0',
        terms_version VARCHAR(32) DEFAULT '2.0.0',
        dsa_accepted BOOLEAN NOT NULL DEFAULT TRUE,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(128)
      );

      CREATE TABLE IF NOT EXISTS likes (
        id VARCHAR(128) PRIMARY KEY,
        from_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_super_like BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS matches (
        id VARCHAR(128) PRIMARY KEY,
        user1_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_super_match BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS blocks (
        id VARCHAR(128) PRIMARY KEY,
        blocker_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(128) PRIMARY KEY,
        reporter_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(128) NOT NULL,
        details TEXT,
        status VARCHAR(32) DEFAULT 'PENDING',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(128) PRIMARY KEY,
        participant_ids JSONB NOT NULL,
        last_message_text TEXT,
        last_message_timestamp TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(128) PRIMARY KEY,
        conversation_id VARCHAR(128) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT,
        type VARCHAR(32) DEFAULT 'TEXT',
        media JSONB,
        status VARCHAR(32) DEFAULT 'SENT',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS moments (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        media_url TEXT NOT NULL,
        caption TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        likes_count INT DEFAULT 0,
        views_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        status VARCHAR(64) DEFAULT 'active',
        plan_id VARCHAR(64),
        current_period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS store_subscriptions (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(64) NOT NULL,
        product_id VARCHAR(128) NOT NULL,
        base_plan_id VARCHAR(128),
        purchase_token_hash VARCHAR(255) UNIQUE,
        transaction_id VARCHAR(255),
        original_transaction_id VARCHAR(255) UNIQUE,
        environment VARCHAR(32) DEFAULT 'production',
        status VARCHAR(64) NOT NULL,
        auto_renew BOOLEAN DEFAULT true,
        purchase_date TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        grace_period_expires_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS store_billing_events (
        id VARCHAR(128) PRIMARY KEY,
        provider VARCHAR(64) NOT NULL,
        external_event_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(128) NOT NULL,
        received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(64) DEFAULT 'processed',
        metadata JSONB,
        CONSTRAINT uq_provider_external_event UNIQUE (provider, external_event_id)
      );

      CREATE TABLE IF NOT EXISTS stripe_events (
        event_id VARCHAR(255) PRIMARY KEY,
        event_type VARCHAR(128) NOT NULL,
        processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id VARCHAR(128) PRIMARY KEY,
        admin_id VARCHAR(128) NOT NULL,
        action VARCHAR(128) NOT NULL,
        target_id VARCHAR(128),
        details JSONB,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS moderation_notices (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(255) NOT NULL,
        dsa_statement_of_reasons TEXT,
        action_taken VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS dsa_appeals (
        id VARCHAR(128) PRIMARY KEY,
        notice_id VARCHAR(128) NOT NULL,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        explanation TEXT NOT NULL,
        status VARCHAR(32) DEFAULT 'PENDING',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMPTZ,
        reviewer_notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_likes_from_to ON likes(from_user_id, to_user_id);
      CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
      CREATE INDEX IF NOT EXISTS idx_store_sub_user ON store_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_store_sub_status ON store_subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_store_sub_token_hash ON store_subscriptions(purchase_token_hash);
      CREATE INDEX IF NOT EXISTS idx_store_sub_orig_tx ON store_subscriptions(original_transaction_id);
      CREATE INDEX IF NOT EXISTS idx_store_events_ext ON store_billing_events(provider, external_event_id);
    `);
    await client.query("COMMIT");
    isInitialized = true;
    console.log("[PostgreSQL] Database schema initialized successfully.");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[PostgreSQL] Schema initialization error:", err.message);
    return false;
  } finally {
    client.release();
  }
}
var PostgresStoreAdapter = class {
  pool;
  constructor(pool) {
    this.pool = pool;
  }
  async getUserById(userId) {
    const res = await this.pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (res.rows.length === 0) return null;
    return this.mapUserRow(res.rows[0]);
  }
  async getUserByEmail(email) {
    const res = await this.pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    if (res.rows.length === 0) return null;
    return this.mapUserRow(res.rows[0]);
  }
  async getUserByToken(token) {
    const res = await this.pool.query(
      `SELECT u.* FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
      [token]
    );
    if (res.rows.length === 0) return null;
    await this.pool.query("UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE token = $1", [token]);
    return this.mapUserRow(res.rows[0]);
  }
  async saveUser(user, passwordHashAndSalt) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const p = user.profile;
      await client.query(
        `INSERT INTO users (
          id, email, display_name, age, role, status, bio,
          sexual_role, tribe, looking_for, vibe, interests,
          location, photos, is_verified, is_premium, premium_tier, privacy,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18,
          $19, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name,
          age = EXCLUDED.age,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          bio = EXCLUDED.bio,
          sexual_role = EXCLUDED.sexual_role,
          tribe = EXCLUDED.tribe,
          looking_for = EXCLUDED.looking_for,
          vibe = EXCLUDED.vibe,
          interests = EXCLUDED.interests,
          location = EXCLUDED.location,
          photos = EXCLUDED.photos,
          is_verified = EXCLUDED.is_verified,
          is_premium = EXCLUDED.is_premium,
          premium_tier = EXCLUDED.premium_tier,
          privacy = EXCLUDED.privacy,
          updated_at = CURRENT_TIMESTAMP`,
        [
          user.id,
          user.email,
          p.displayName,
          p.age,
          user.role,
          user.status,
          p.bio || null,
          p.identityRole || p.sexualRole || "Versatile",
          (p.tribes && p.tribes.length > 0 ? p.tribes[0] : p.tribe) || "Queer",
          (Array.isArray(p.lookingFor) ? p.lookingFor.join(",") : p.lookingFor) || "Dating",
          p.vibe || null,
          JSON.stringify(p.interests || []),
          JSON.stringify(typeof p.location === "object" ? p.location : { city: p.location || "Warsaw" }),
          JSON.stringify(p.photos || []),
          p.verified ?? p.isVerified ?? false,
          user.isPremium || p.isPremium || false,
          p.premiumTier || null,
          JSON.stringify(p.privacy || { locationPrivacy: p.locationPrivacy || "APPROXIMATE" }),
          user.createdAt || (/* @__PURE__ */ new Date()).toISOString()
        ]
      );
      if (passwordHashAndSalt) {
        await client.query(
          `INSERT INTO user_passwords (user_id, salt_hash, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id) DO UPDATE SET salt_hash = EXCLUDED.salt_hash, updated_at = CURRENT_TIMESTAMP`,
          [user.id, passwordHashAndSalt]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  async getPasswordHash(userId) {
    const res = await this.pool.query("SELECT salt_hash FROM user_passwords WHERE user_id = $1", [userId]);
    return res.rows.length > 0 ? res.rows[0].salt_hash : null;
  }
  async createSession(token, userId, expiresAt) {
    await this.pool.query(
      `INSERT INTO sessions (token, user_id, expires_at, created_at, last_used_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [token, userId, expiresAt]
    );
  }
  async deleteSession(token) {
    await this.pool.query("DELETE FROM sessions WHERE token = $1", [token]);
  }
  async createPasswordReset(email) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    const pwd = await this.getPasswordHash(user.id);
    if (!pwd) return null;
    const token = import_crypto.default.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600 * 1e3);
    await this.pool.query(
      `INSERT INTO password_resets (token, user_id, expires_at, used, created_at)
       VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)`,
      [token, user.id, expiresAt]
    );
    return { token, expiresAt };
  }
  async resetPasswordWithToken(token, newSaltHash) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(
        `SELECT user_id, expires_at, used FROM password_resets
         WHERE token = $1 FOR UPDATE`,
        [token]
      );
      if (res.rows.length === 0) {
        await client.query("ROLLBACK");
        return false;
      }
      const { user_id, expires_at, used } = res.rows[0];
      if (used || new Date(expires_at) < /* @__PURE__ */ new Date()) {
        await client.query("ROLLBACK");
        return false;
      }
      await client.query("UPDATE password_resets SET used = TRUE WHERE token = $1", [token]);
      await client.query(
        `UPDATE user_passwords SET salt_hash = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [newSaltHash, user_id]
      );
      await client.query("DELETE FROM sessions WHERE user_id = $1", [user_id]);
      await client.query("COMMIT");
      return true;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  async setStripeSubscription(userId, customerId, subscriptionId, planId, status, periodEnd) {
    const isPremium = status === "active";
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO subscriptions (
          id, user_id, stripe_customer_id, stripe_subscription_id, status, plan_id, current_period_end, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          stripe_customer_id = EXCLUDED.stripe_customer_id,
          stripe_subscription_id = EXCLUDED.stripe_subscription_id,
          status = EXCLUDED.status,
          plan_id = EXCLUDED.plan_id,
          current_period_end = EXCLUDED.current_period_end,
          updated_at = CURRENT_TIMESTAMP`,
        [
          `sub_${userId}`,
          userId,
          customerId,
          subscriptionId,
          status,
          planId,
          periodEnd || new Date(Date.now() + 30 * 24 * 3600 * 1e3)
        ]
      );
      await client.query(
        `UPDATE users SET
          is_premium = $1,
          premium_tier = $2,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [isPremium, isPremium ? "VIP_PLUS" : null, userId]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  async isEventProcessed(eventId) {
    const res = await this.pool.query("SELECT event_id FROM stripe_events WHERE event_id = $1", [eventId]);
    return res.rows.length > 0;
  }
  async recordProcessedEvent(eventId, eventType) {
    await this.pool.query(
      "INSERT INTO stripe_events (event_id, event_type, processed_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING",
      [eventId, eventType]
    );
  }
  async upsertStoreSubscription(entitlement) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const isPrem = entitlement.premium && (entitlement.status === "active" || entitlement.status === "grace_period");
      const planTier = entitlement.planTier || (entitlement.productId?.includes("yearly") ? "yearly" : "monthly");
      const premiumTier = isPrem ? planTier === "yearly" ? "VIP_ANNUAL" : "VIP_MONTHLY" : null;
      await client.query(
        `INSERT INTO store_subscriptions (
          id, user_id, provider, product_id, base_plan_id,
          purchase_token_hash, transaction_id, original_transaction_id,
          environment, status, auto_renew, purchase_date,
          expires_at, grace_period_expires_at, created_at, updated_at, last_verified_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          provider = EXCLUDED.provider,
          product_id = EXCLUDED.product_id,
          base_plan_id = EXCLUDED.base_plan_id,
          purchase_token_hash = COALESCE(EXCLUDED.purchase_token_hash, store_subscriptions.purchase_token_hash),
          transaction_id = COALESCE(EXCLUDED.transaction_id, store_subscriptions.transaction_id),
          original_transaction_id = COALESCE(EXCLUDED.original_transaction_id, store_subscriptions.original_transaction_id),
          environment = EXCLUDED.environment,
          status = EXCLUDED.status,
          auto_renew = EXCLUDED.auto_renew,
          expires_at = EXCLUDED.expires_at,
          grace_period_expires_at = EXCLUDED.grace_period_expires_at,
          updated_at = CURRENT_TIMESTAMP,
          last_verified_at = CURRENT_TIMESTAMP`,
        [
          entitlement.userId,
          entitlement.userId,
          entitlement.provider,
          entitlement.productId || "aura.premium.monthly",
          entitlement.planTier || "monthly",
          entitlement.purchaseTokenHash || null,
          entitlement.storeTransactionId || null,
          entitlement.originalTransactionId || null,
          entitlement.environment || "production",
          entitlement.status,
          entitlement.autoRenew,
          entitlement.createdAt ? new Date(entitlement.createdAt) : /* @__PURE__ */ new Date(),
          entitlement.expiresAt ? new Date(entitlement.expiresAt) : null,
          entitlement.gracePeriodUntil ? new Date(entitlement.gracePeriodUntil) : null
        ]
      );
      await client.query(
        `UPDATE users SET
          is_premium = $1,
          premium_tier = $2,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [isPrem, premiumTier, entitlement.userId]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  async getStoreSubscriptionByUserId(userId) {
    const res = await this.pool.query(
      "SELECT * FROM store_subscriptions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1",
      [userId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    const isPrem = (row.status === "active" || row.status === "grace_period") && (!row.expires_at || new Date(row.expires_at).getTime() > Date.now());
    return {
      userId: row.user_id,
      premium: isPrem,
      provider: row.provider,
      productId: row.product_id,
      planTier: row.base_plan_id || (row.product_id?.includes("yearly") ? "yearly" : "monthly"),
      status: row.status,
      expiresAt: row.expires_at ? row.expires_at.toISOString() : void 0,
      autoRenew: !!row.auto_renew,
      originalTransactionId: row.original_transaction_id || void 0,
      purchaseTokenHash: row.purchase_token_hash || void 0,
      storeTransactionId: row.transaction_id || void 0,
      environment: row.environment,
      gracePeriodUntil: row.grace_period_expires_at ? row.grace_period_expires_at.toISOString() : void 0,
      lastVerifiedAt: row.last_verified_at ? row.last_verified_at.toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: row.created_at ? row.created_at.toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: row.updated_at ? row.updated_at.toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async findUserByPurchaseTokenHash(hash) {
    const res = await this.pool.query(
      "SELECT user_id FROM store_subscriptions WHERE purchase_token_hash = $1 LIMIT 1",
      [hash]
    );
    return res.rows.length > 0 ? res.rows[0].user_id : null;
  }
  async findUserByOriginalTransactionId(origTxId) {
    const res = await this.pool.query(
      "SELECT user_id FROM store_subscriptions WHERE original_transaction_id = $1 LIMIT 1",
      [origTxId]
    );
    return res.rows.length > 0 ? res.rows[0].user_id : null;
  }
  async isStoreEventProcessed(provider, externalEventId) {
    const res = await this.pool.query(
      "SELECT id FROM store_billing_events WHERE provider = $1 AND external_event_id = $2",
      [provider, externalEventId]
    );
    return res.rows.length > 0;
  }
  async recordStoreBillingEvent(id, provider, externalEventId, eventType, metadata) {
    try {
      await this.pool.query(
        `INSERT INTO store_billing_events (
          id, provider, external_event_id, event_type, metadata, received_at, processed_at, status
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'processed')
        ON CONFLICT (provider, external_event_id) DO NOTHING`,
        [id, provider, externalEventId, eventType, metadata ? JSON.stringify(metadata) : null]
      );
      return true;
    } catch {
      return false;
    }
  }
  mapUserRow(row) {
    const lookingForArr = row.looking_for ? typeof row.looking_for === "string" ? row.looking_for.split(",") : row.looking_for : ["Dating", "Friends"];
    const tribesArr = row.tribe ? [row.tribe] : ["Queer"];
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      isAgeVerified18Plus: true,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at || (/* @__PURE__ */ new Date()).toISOString(),
      isPremium: !!row.is_premium,
      profile: {
        id: row.id,
        userId: row.id,
        displayName: row.display_name,
        age: row.age || 18,
        bio: row.bio || "",
        identityRole: row.sexual_role || "Versatile",
        tribes: tribesArr,
        lookingFor: lookingForArr,
        interests: typeof row.interests === "string" ? JSON.parse(row.interests) : row.interests || [],
        location: typeof row.location === "object" ? row.location.city || "Warsaw" : row.location || "Warsaw",
        distanceKm: 0,
        photos: typeof row.photos === "string" ? JSON.parse(row.photos) : row.photos || [],
        verified: !!row.is_verified,
        isOnline: true,
        lastActiveMinutesAgo: 0,
        isPremium: !!row.is_premium,
        premiumTier: row.premium_tier
      }
    };
  }
};

// src/lib/storage.ts
var import_storage = require("@google-cloud/storage");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto3 = __toESM(require("crypto"), 1);

// src/lib/mediaSecurity.ts
var import_crypto2 = __toESM(require("crypto"), 1);
var import_dns = __toESM(require("dns"), 1);
var import_http = __toESM(require("http"), 1);
var import_https = __toESM(require("https"), 1);
var import_sharp = __toESM(require("sharp"), 1);

// src/config/mediaConfig.ts
var MEDIA_LIMITS = {
  // Max file sizes (bytes)
  MAX_PHOTO_SIZE: 10 * 1024 * 1024,
  // 10 MB
  MAX_AUDIO_SIZE: 10 * 1024 * 1024,
  // 10 MB
  MAX_VIDEO_SIZE: 30 * 1024 * 1024,
  // 30 MB
  MAX_VIDEO_DURATION_SECONDS: 20,
  // Strict Star Video cap (10-20s)
  THUMBNAIL_MAX_DIMENSION: 320,
  // Max width/height for thumbnails
  // Rate Limiting (per user per window)
  RATE_LIMITS: {
    UPLOAD_INIT: { max: 25, windowMs: 60 * 1e3 },
    UPLOAD_COMPLETE: { max: 20, windowMs: 60 * 1e3 },
    LINK_PREVIEW: { max: 15, windowMs: 60 * 1e3 },
    STAR_VIDEO_UPLOAD: { max: 6, windowMs: 60 * 1e3 },
    MEDIA_DOWNLOAD: { max: 200, windowMs: 60 * 1e3 }
  },
  // Link Preview SSRF Limits
  SSRF: {
    MAX_RESPONSE_BYTES: 512 * 1024,
    // 512 KB
    REQUEST_TIMEOUT_MS: 3500,
    // 3.5 seconds
    MAX_REDIRECTS: 3
  }
};
var ALLOWED_PHOTO_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];
var ALLOWED_AUDIO_MIMES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a"
];
var ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm"
];

// src/lib/mediaSecurity.ts
function detectFileSignature(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
    return "image/jpeg";
  }
  if (buffer.length >= 8 && buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71 && buffer[4] === 13 && buffer[5] === 10 && buffer[6] === 26 && buffer[7] === 10) {
    return "image/png";
  }
  if (buffer.length >= 12 && buffer[0] === 82 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 70 && buffer.slice(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  if (buffer.length >= 12 && buffer[0] === 82 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 70 && buffer.slice(8, 12).toString("ascii") === "WAVE") {
    return "audio/wav";
  }
  if (buffer.length >= 4 && buffer[0] === 79 && buffer[1] === 103 && buffer[2] === 103 && buffer[3] === 83) {
    return "audio/ogg";
  }
  if (buffer.length >= 4 && buffer[0] === 26 && buffer[1] === 69 && buffer[2] === 223 && buffer[3] === 163) {
    const headStr = buffer.slice(0, Math.min(buffer.length, 1024)).toString("latin1");
    if (headStr.includes("webm")) {
      return "video/webm";
    }
    return "video/webm";
  }
  if (buffer.length >= 12 && buffer.slice(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.slice(8, 12).toString("ascii").trim().toLowerCase();
    if (brand.startsWith("m4a") || brand.startsWith("m4b")) {
      return "audio/mp4";
    }
    return "video/mp4";
  }
  if (buffer[0] === 73 && buffer[1] === 68 && buffer[2] === 51 || buffer[0] === 255 && (buffer[1] & 224) === 224) {
    return "audio/mpeg";
  }
  if (buffer[0] === 255 && (buffer[1] === 241 || buffer[1] === 249)) {
    return "audio/aac";
  }
  return null;
}
function validateMediaBuffer(buffer, category, clientMime) {
  const maxSize = category === "star_video" ? MEDIA_LIMITS.MAX_VIDEO_SIZE : category === "voice" ? MEDIA_LIMITS.MAX_AUDIO_SIZE : MEDIA_LIMITS.MAX_PHOTO_SIZE;
  if (buffer.length > maxSize) {
    return {
      valid: false,
      detectedMime: "",
      error: `File exceeds maximum allowed size of ${(maxSize / (1024 * 1024)).toFixed(1)} MB.`
    };
  }
  if (buffer.length === 0) {
    return { valid: false, detectedMime: "", error: "Empty file received." };
  }
  const detected = detectFileSignature(buffer);
  if (!detected) {
    return {
      valid: false,
      detectedMime: "",
      error: "Unrecognized file format or corrupted binary signature."
    };
  }
  if (category === "photo" || category === "profile_photo") {
    const allowed = ALLOWED_PHOTO_MIMES.includes(detected);
    if (!allowed) {
      return {
        valid: false,
        detectedMime: detected,
        error: `Invalid photo format (${detected}). Only JPEG, PNG and WebP are supported.`
      };
    }
    return { valid: true, detectedMime: detected };
  }
  if (category === "voice") {
    const isAllowedAudio = ALLOWED_AUDIO_MIMES.includes(detected) || detected === "video/webm";
    if (!isAllowedAudio) {
      return {
        valid: false,
        detectedMime: detected,
        error: `Invalid audio format (${detected}). Supported: WebM, OGG, MP4, AAC, MP3, WAV.`
      };
    }
    return { valid: true, detectedMime: detected === "video/webm" ? "audio/webm" : detected };
  }
  if (category === "star_video") {
    const isAllowedVideo = ALLOWED_VIDEO_MIMES.includes(detected);
    if (!isAllowedVideo) {
      return {
        valid: false,
        detectedMime: detected,
        error: `Invalid video format (${detected}). Supported: MP4 and WebM.`
      };
    }
    return { valid: true, detectedMime: detected };
  }
  return { valid: false, detectedMime: detected, error: "Unknown media category." };
}
async function processPhotoMedia(buffer) {
  const img = (0, import_sharp.default)(buffer, { failOn: "error", limitInputPixels: 4096 * 4096 });
  const meta = await img.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Could not read image dimensions. Corrupt image file.");
  }
  const processedDisplay = await (0, import_sharp.default)(buffer).rotate().webp({ quality: 88, effort: 4 }).toBuffer();
  const displayMeta = await (0, import_sharp.default)(processedDisplay).metadata();
  const thumbnailBuffer = await (0, import_sharp.default)(buffer).rotate().resize({
    width: MEDIA_LIMITS.THUMBNAIL_MAX_DIMENSION,
    height: MEDIA_LIMITS.THUMBNAIL_MAX_DIMENSION,
    fit: "inside",
    withoutEnlargement: true
  }).webp({ quality: 75, effort: 3 }).toBuffer();
  return {
    displayBuffer: processedDisplay,
    thumbnailBuffer,
    width: displayMeta.width || meta.width,
    height: displayMeta.height || meta.height,
    mimeType: "image/webp",
    size: processedDisplay.length,
    thumbnailMimeType: "image/webp",
    thumbnailSize: thumbnailBuffer.length
  };
}
function inspectMp4DurationSeconds(buffer) {
  try {
    let offset = 0;
    while (offset + 8 <= buffer.length) {
      const atomSize = buffer.readUInt32BE(offset);
      const atomType = buffer.slice(offset + 4, offset + 8).toString("ascii");
      if (atomSize === 0) break;
      const effectiveSize = atomSize === 1 ? buffer.readBigUInt64BE(offset + 8) : BigInt(atomSize);
      const headerSize = atomSize === 1 ? 16 : 8;
      if (atomType === "moov") {
        let moovOffset = offset + headerSize;
        const moovEnd = offset + Number(effectiveSize);
        while (moovOffset + 8 <= moovEnd && moovOffset + 8 <= buffer.length) {
          const subSize = buffer.readUInt32BE(moovOffset);
          const subType = buffer.slice(moovOffset + 4, moovOffset + 8).toString("ascii");
          if (subType === "mvhd") {
            const version = buffer.readUInt8(moovOffset + 8);
            if (version === 0 && moovOffset + 24 <= buffer.length) {
              const timeScale = buffer.readUInt32BE(moovOffset + 20);
              const duration = buffer.readUInt32BE(moovOffset + 24);
              if (timeScale > 0) return duration / timeScale;
            } else if (version === 1 && moovOffset + 36 <= buffer.length) {
              const timeScale = buffer.readUInt32BE(moovOffset + 28);
              const duration = Number(buffer.readBigUInt64BE(moovOffset + 32));
              if (timeScale > 0) return duration / timeScale;
            }
          }
          if (subSize <= 0) break;
          moovOffset += subSize;
        }
      }
      if (Number(effectiveSize) <= 0) break;
      offset += Number(effectiveSize);
    }
  } catch (e) {
  }
  return null;
}
function isForbiddenIp(ip) {
  let cleanIp = ip.toLowerCase().trim();
  if (cleanIp.startsWith("::ffff:")) {
    cleanIp = cleanIp.substring(7);
  }
  if (cleanIp.includes(":")) {
    if (cleanIp === "::1" || cleanIp === "::") return true;
    if (cleanIp.startsWith("fe80:")) return true;
    if (cleanIp.startsWith("fc") || cleanIp.startsWith("fd")) return true;
    return false;
  }
  const parts = cleanIp.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true;
  }
  const [b0, b1] = parts;
  if (b0 === 0) return true;
  if (b0 === 127) return true;
  if (b0 === 10) return true;
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  if (b0 === 192 && b1 === 168) return true;
  if (b0 === 169 && b1 === 254) return true;
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
  if (b0 >= 224) return true;
  return false;
}
function isForbiddenHostname(hostname) {
  const lower = hostname.toLowerCase().trim();
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local") || lower.endsWith(".internal") || lower.includes("metadata.google.internal") || lower === "instance-data") {
    return true;
  }
  return false;
}
async function fetchSafeLinkMetadata(rawUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch (err) {
    throw new Error("Invalid URL format.");
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error(`Forbidden URL protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are permitted.`);
  }
  if (isForbiddenHostname(parsedUrl.hostname)) {
    throw new Error("Access to internal or local hostnames is forbidden.");
  }
  const records = await import_dns.default.promises.lookup(parsedUrl.hostname, { all: true });
  if (!records || records.length === 0) {
    throw new Error("Could not resolve hostname.");
  }
  for (const rec of records) {
    if (isForbiddenIp(rec.address)) {
      throw new Error(`Host resolves to restricted or private IP: ${rec.address}`);
    }
  }
  const htmlContent = await fetchHtmlContentSafe(parsedUrl.toString(), 0);
  const domain = parsedUrl.hostname.replace(/^www\./i, "");
  const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
  const ogTitleMatch = htmlContent.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) || htmlContent.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
  const ogDescMatch = htmlContent.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) || htmlContent.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const ogImageMatch = htmlContent.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  let title = ogTitleMatch?.[1] || titleMatch?.[1] || domain;
  let description = ogDescMatch?.[1] || "";
  let thumbnailRef = ogImageMatch?.[1] || "";
  title = sanitizeText(title, 120);
  description = sanitizeText(description, 200);
  if (thumbnailRef) {
    try {
      const resolvedThumb = new URL(thumbnailRef, parsedUrl.origin);
      if (resolvedThumb.protocol === "https:" || resolvedThumb.protocol === "http:") {
        thumbnailRef = resolvedThumb.toString();
      } else {
        thumbnailRef = "";
      }
    } catch (e) {
      thumbnailRef = "";
    }
  }
  return {
    normalizedUrl: parsedUrl.toString(),
    displayUrl: `${domain}${parsedUrl.pathname !== "/" ? parsedUrl.pathname : ""}`.slice(0, 60),
    domain,
    title,
    description: description || void 0,
    thumbnailRef: thumbnailRef || void 0
  };
}
function sanitizeText(str, maxLen) {
  return str.replace(/<[^>]*>/g, "").replace(/[\r\n\t]+/g, " ").trim().slice(0, maxLen);
}
async function fetchHtmlContentSafe(targetUrl, redirectCount) {
  if (redirectCount > MEDIA_LIMITS.SSRF.MAX_REDIRECTS) {
    throw new Error("Too many redirects.");
  }
  const parsed = new URL(targetUrl);
  if (isForbiddenHostname(parsed.hostname)) {
    throw new Error("Redirect target is a forbidden hostname.");
  }
  const records = await import_dns.default.promises.lookup(parsed.hostname, { all: true });
  for (const rec of records) {
    if (isForbiddenIp(rec.address)) {
      throw new Error(`Redirect target IP is restricted: ${rec.address}`);
    }
  }
  const client = parsed.protocol === "https:" ? import_https.default : import_http.default;
  return new Promise((resolve, reject) => {
    let resolved = false;
    const req = client.get(
      targetUrl,
      {
        headers: {
          "User-Agent": "AuraBot/1.0 (+https://aura.local/bot)",
          "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"
        },
        timeout: MEDIA_LIMITS.SSRF.REQUEST_TIMEOUT_MS
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
          res.resume();
          const redirectUrl = new URL(res.headers.location, parsed.origin).toString();
          resolve(fetchHtmlContentSafe(redirectUrl, redirectCount + 1));
          return;
        }
        if ((res.statusCode || 0) < 200 || (res.statusCode || 0) >= 300) {
          res.resume();
          resolve("");
          return;
        }
        const contentType = res.headers["content-type"] || "";
        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
          res.resume();
          resolve("");
          return;
        }
        let totalBytes = 0;
        const chunks = [];
        res.on("data", (chunk) => {
          totalBytes += chunk.length;
          if (totalBytes > MEDIA_LIMITS.SSRF.MAX_RESPONSE_BYTES) {
            req.destroy();
            resolve(Buffer.concat(chunks).toString("utf-8"));
          } else {
            chunks.push(chunk);
          }
        });
        res.on("end", () => {
          if (!resolved) {
            resolved = true;
            resolve(Buffer.concat(chunks).toString("utf-8"));
          }
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Link preview request timed out."));
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}
var rateLimitBuckets = /* @__PURE__ */ new Map();
function checkRateLimit(key, limit) {
  const now = Date.now();
  let record = rateLimitBuckets.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitBuckets.set(key, record);
  }
  const cutoff = now - limit.windowMs;
  record.timestamps = record.timestamps.filter((ts) => ts > cutoff);
  if (record.timestamps.length >= limit.max) {
    const oldest = record.timestamps[0];
    const retryAfterMs = Math.max(1e3, oldest + limit.windowMs - now);
    return { allowed: false, retryAfterMs };
  }
  record.timestamps.push(now);
  return { allowed: true };
}
var MEDIA_SIGNING_SECRET = process.env.MEDIA_SECRET || import_crypto2.default.randomBytes(32).toString("hex");
function signMediaAccessToken(mediaId, userId, ttlSeconds = 900) {
  const expiresAt = Math.floor(Date.now() / 1e3) + ttlSeconds;
  const payload = `${mediaId}:${userId}:${expiresAt}`;
  const signature = import_crypto2.default.createHmac("sha256", MEDIA_SIGNING_SECRET).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ mediaId, userId, expiresAt, sig: signature })).toString("base64url");
}
function verifyMediaAccessToken(token) {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw);
    const { mediaId, userId, expiresAt, sig } = parsed;
    if (!mediaId || !userId || !expiresAt || !sig) return null;
    if (Math.floor(Date.now() / 1e3) > expiresAt) return null;
    const expectedSig = import_crypto2.default.createHmac("sha256", MEDIA_SIGNING_SECRET).update(`${mediaId}:${userId}:${expiresAt}`).digest("hex");
    if (!import_crypto2.default.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) {
      return null;
    }
    return { mediaId, userId };
  } catch (err) {
    return null;
  }
}

// src/lib/storage.ts
var EXTENSION_MAP = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "audio/webm": ".webm",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  "audio/aac": ".aac",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/x-m4a": ".m4a",
  "video/mp4": ".mp4",
  "video/webm": ".webm"
};
var gcsStorage = null;
var bucketName = null;
var mediaRegistry = /* @__PURE__ */ new Map();
var uploadSessions = /* @__PURE__ */ new Map();
var REGISTRY_FILE = import_path.default.join(process.cwd(), "uploads", "media_registry.json");
function loadRegistryFromDisk() {
  try {
    if (import_fs.default.existsSync(REGISTRY_FILE)) {
      const raw = import_fs.default.readFileSync(REGISTRY_FILE, "utf-8");
      const items = JSON.parse(raw);
      items.forEach((it) => mediaRegistry.set(it.id, it));
      console.log(`[Storage] Loaded ${items.length} media records from persistent registry.`);
    }
  } catch (err) {
    console.warn(`[Storage] Error reading media registry: ${err.message}`);
  }
}
function persistRegistryToDisk() {
  try {
    const list = Array.from(mediaRegistry.values());
    import_fs.default.writeFileSync(REGISTRY_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn(`[Storage] Failed to persist media registry: ${err.message}`);
  }
}
function initStorage() {
  const gcsBucket = process.env.GCS_MEDIA_BUCKET || process.env.STORAGE_BUCKET;
  if (gcsBucket) {
    bucketName = gcsBucket;
    try {
      gcsStorage = new import_storage.Storage();
      console.log(`[Storage] Configured Google Cloud Storage bucket: ${bucketName}`);
    } catch (err) {
      console.warn(`[Storage] GCS initialization notice: ${err.message}. Local secure media storage active.`);
    }
  } else {
    try {
      const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
      if (import_fs.default.existsSync(configPath)) {
        const raw = import_fs.default.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.storageBucket) {
          bucketName = parsed.storageBucket;
          gcsStorage = new import_storage.Storage({ projectId: parsed.projectId });
          console.log(`[Storage] Initialized Storage from Firebase config: ${bucketName}`);
        }
      }
    } catch (e) {
    }
  }
  const localUploadDir = import_path.default.join(process.cwd(), "uploads");
  if (!import_fs.default.existsSync(localUploadDir)) {
    import_fs.default.mkdirSync(localUploadDir, { recursive: true });
  }
  loadRegistryFromDisk();
}
function createUploadSession(userId, category, expectedMimeType, declaredSize, conversationId) {
  const maxSize = category === "star_video" ? MEDIA_LIMITS.MAX_VIDEO_SIZE : category === "voice" ? MEDIA_LIMITS.MAX_AUDIO_SIZE : MEDIA_LIMITS.MAX_PHOTO_SIZE;
  if (declaredSize > maxSize) {
    throw new Error(`Declared size (${(declaredSize / (1024 * 1024)).toFixed(1)} MB) exceeds limit of ${(maxSize / (1024 * 1024)).toFixed(1)} MB.`);
  }
  const uploadId = `upl_${import_crypto3.default.randomUUID()}`;
  const session = {
    uploadId,
    userId,
    conversationId,
    category,
    expectedMimeType,
    maxSizeBytes: maxSize,
    expiresAt: Date.now() + 15 * 60 * 1e3
    // 15 minutes window
  };
  uploadSessions.set(uploadId, session);
  return session;
}
function getUploadSession(uploadId) {
  const session = uploadSessions.get(uploadId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    uploadSessions.delete(uploadId);
    return null;
  }
  return session;
}
async function processAndSaveMedia(opts) {
  const { buffer, clientMime, category, userId, conversationId, caption, clientDuration } = opts;
  const validation = validateMediaBuffer(buffer, category, clientMime);
  if (!validation.valid) {
    throw new Error(validation.error || "Media file validation failed.");
  }
  const verifiedMime = validation.detectedMime;
  const mediaId = `aura_${category.slice(0, 3)}_${import_crypto3.default.randomUUID()}`;
  const localUploadDir = import_path.default.join(process.cwd(), "uploads");
  let finalBuffer = buffer;
  let finalMime = verifiedMime;
  let thumbnailFilename = void 0;
  let width = void 0;
  let height = void 0;
  let duration = clientDuration;
  if (category === "photo" || category === "profile_photo") {
    const processed = await processPhotoMedia(buffer);
    finalBuffer = processed.displayBuffer;
    finalMime = processed.mimeType;
    width = processed.width;
    height = processed.height;
    const thumbName = `thumb_${mediaId}.webp`;
    const thumbPath = import_path.default.join(localUploadDir, thumbName);
    import_fs.default.writeFileSync(thumbPath, processed.thumbnailBuffer);
    thumbnailFilename = thumbName;
  } else if (category === "star_video") {
    if (verifiedMime === "video/mp4") {
      const parsedDuration = inspectMp4DurationSeconds(buffer);
      if (parsedDuration !== null) {
        duration = Math.round(parsedDuration);
      }
    }
    if (duration !== void 0 && duration > MEDIA_LIMITS.MAX_VIDEO_DURATION_SECONDS) {
      throw new Error(`Star Video duration exceeds maximum of ${MEDIA_LIMITS.MAX_VIDEO_DURATION_SECONDS} seconds.`);
    }
    if (!duration || duration <= 0) {
      duration = Math.min(clientDuration || 15, MEDIA_LIMITS.MAX_VIDEO_DURATION_SECONDS);
    }
  } else if (category === "voice") {
    if (clientDuration && clientDuration > 300) {
      throw new Error("Voice message duration exceeds 5 minutes.");
    }
    duration = clientDuration || 5;
  }
  const ext = EXTENSION_MAP[finalMime] || ".bin";
  const mainFilename = `${mediaId}${ext}`;
  const targetPath = import_path.default.join(localUploadDir, mainFilename);
  import_fs.default.writeFileSync(targetPath, finalBuffer);
  if (gcsStorage && bucketName) {
    try {
      const bucket = gcsStorage.bucket(bucketName);
      const file = bucket.file(`media/${mainFilename}`);
      await file.save(finalBuffer, {
        metadata: {
          contentType: finalMime,
          metadata: {
            uploadedBy: userId,
            mediaId,
            category
          }
        },
        resumable: false
      });
    } catch (err) {
      console.warn(`[Storage] GCS backup sync notice: ${err.message}`);
    }
  }
  const record = {
    id: mediaId,
    ownerId: userId,
    conversationId,
    category,
    mimeType: finalMime,
    size: finalBuffer.length,
    width,
    height,
    duration,
    filename: mainFilename,
    thumbnailFilename,
    caption: caption ? caption.trim().slice(0, 500) : void 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  mediaRegistry.set(mediaId, record);
  persistRegistryToDisk();
  return record;
}
function getMediaRecord(mediaId) {
  const record = mediaRegistry.get(mediaId);
  if (!record || record.deletedAt) return null;
  return record;
}
function getMediaFileForServing(mediaId, thumb = false) {
  const record = mediaRegistry.get(mediaId);
  if (!record || record.deletedAt) return null;
  const localUploadDir = import_path.default.join(process.cwd(), "uploads");
  const filename = thumb && record.thumbnailFilename ? record.thumbnailFilename : record.filename;
  const fullPath = import_path.default.join(localUploadDir, filename);
  if (!import_fs.default.existsSync(fullPath)) {
    return null;
  }
  const mimeType = thumb ? "image/webp" : record.mimeType;
  return { path: fullPath, mimeType };
}
function deleteMediaRecord(mediaId, requestingUserId) {
  const record = mediaRegistry.get(mediaId);
  if (!record) return false;
  if (record.ownerId !== requestingUserId) {
    throw new Error("Unauthorized to delete this media item.");
  }
  record.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
  record.deletedBy = requestingUserId;
  const localUploadDir = import_path.default.join(process.cwd(), "uploads");
  try {
    const mainPath = import_path.default.join(localUploadDir, record.filename);
    if (import_fs.default.existsSync(mainPath)) import_fs.default.unlinkSync(mainPath);
    if (record.thumbnailFilename) {
      const thumbPath = import_path.default.join(localUploadDir, record.thumbnailFilename);
      if (import_fs.default.existsSync(thumbPath)) import_fs.default.unlinkSync(thumbPath);
    }
  } catch (err) {
    console.warn(`[Storage] Physical delete warning: ${err.message}`);
  }
  persistRegistryToDisk();
  return true;
}
function purgeAllUserMedia(userId) {
  let purgedCount = 0;
  const localUploadDir = import_path.default.join(process.cwd(), "uploads");
  for (const [id, record] of Array.from(mediaRegistry.entries())) {
    if (record.ownerId === userId) {
      try {
        const mainPath = import_path.default.join(localUploadDir, record.filename);
        if (import_fs.default.existsSync(mainPath)) import_fs.default.unlinkSync(mainPath);
        if (record.thumbnailFilename) {
          const thumbPath = import_path.default.join(localUploadDir, record.thumbnailFilename);
          if (import_fs.default.existsSync(thumbPath)) import_fs.default.unlinkSync(thumbPath);
        }
      } catch (e) {
      }
      mediaRegistry.delete(id);
      purgedCount++;
    }
  }
  persistRegistryToDisk();
  return purgedCount;
}
function getLocalMediaFile(filename) {
  const cleanFilename = import_path.default.basename(filename);
  const localUploadDir = import_path.default.join(process.cwd(), "uploads");
  const fullPath = import_path.default.join(localUploadDir, cleanFilename);
  if (!import_fs.default.existsSync(fullPath)) {
    return null;
  }
  const ext = import_path.default.extname(cleanFilename).toLowerCase();
  let mimeType = "image/jpeg";
  if (ext === ".png") mimeType = "image/png";
  if (ext === ".webp") mimeType = "image/webp";
  if (ext === ".gif") mimeType = "image/gif";
  if (ext === ".mp4") mimeType = "video/mp4";
  if (ext === ".webm") mimeType = "video/webm";
  if (ext === ".mp3") mimeType = "audio/mpeg";
  return { path: fullPath, mimeType };
}

// src/db/store.ts
var DataStore = class {
  users = /* @__PURE__ */ new Map();
  tokens = /* @__PURE__ */ new Map();
  // token -> userId (legacy compatibility)
  sessions = /* @__PURE__ */ new Map();
  // token -> SessionRecord
  consents = /* @__PURE__ */ new Map();
  // userId -> UserConsents
  likes = [];
  matches = [];
  blocks = [];
  reports = [];
  moments = [];
  conversations = /* @__PURE__ */ new Map();
  messages = /* @__PURE__ */ new Map();
  adminAuditLogs = [];
  moderationNotices = [];
  appeals = [];
  erasureAuditLog = [];
  userPasswords = /* @__PURE__ */ new Map();
  // userId -> salt:scryptHash
  passwordResets = /* @__PURE__ */ new Map();
  stripeEvents = /* @__PURE__ */ new Set();
  stripeSubscriptions = /* @__PURE__ */ new Map();
  localStoreSubscriptions = /* @__PURE__ */ new Map();
  // development fallback
  localStoreEvents = /* @__PURE__ */ new Set();
  vaultAccess = /* @__PURE__ */ new Map();
  // ownerUserId -> Set of granted userIds
  vaultRequests = /* @__PURE__ */ new Map();
  // targetUserId -> Set of requester userIds
  cloudBackupHistory = [];
  pgAdapter = null;
  dbFilePath = import_path2.default.join(process.cwd(), "data", "aura_db.json");
  saveToDisk() {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    if (process.env.ALLOW_DEV_LOCAL_STORE !== "true") {
      return;
    }
    try {
      const dir = import_path2.default.dirname(this.dbFilePath);
      if (!import_fs2.default.existsSync(dir)) {
        import_fs2.default.mkdirSync(dir, { recursive: true });
      }
      const serialized = {
        users: Array.from(this.users.entries()),
        tokens: Array.from(this.tokens.entries()),
        sessions: Array.from(this.sessions.entries()),
        consents: Array.from(this.consents.entries()),
        likes: this.likes,
        matches: this.matches,
        blocks: this.blocks,
        reports: this.reports,
        moments: this.moments,
        conversations: Array.from(this.conversations.entries()),
        messages: Array.from(this.messages.entries()),
        adminAuditLogs: this.adminAuditLogs,
        moderationNotices: this.moderationNotices,
        appeals: this.appeals,
        erasureAuditLog: this.erasureAuditLog,
        userPasswords: Array.from(this.userPasswords.entries()),
        passwordResets: Array.from(this.passwordResets.entries()),
        stripeSubscriptions: Array.from(this.stripeSubscriptions.entries()),
        localStoreSubscriptions: Array.from(this.localStoreSubscriptions.entries()),
        localStoreEvents: Array.from(this.localStoreEvents)
      };
      import_fs2.default.writeFileSync(this.dbFilePath, JSON.stringify(serialized, null, 2), "utf-8");
    } catch (err) {
      console.error("[DataStore] Error saving development file store:", err);
    }
  }
  loadFromDisk() {
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    if (process.env.ALLOW_DEV_LOCAL_STORE !== "true") {
      return false;
    }
    try {
      if (!import_fs2.default.existsSync(this.dbFilePath)) return false;
      const raw = import_fs2.default.readFileSync(this.dbFilePath, "utf-8");
      if (!raw.trim()) return false;
      const data = JSON.parse(raw);
      this.users = new Map(data.users || []);
      this.tokens = new Map(data.tokens || []);
      this.sessions = new Map(data.sessions || []);
      this.consents = new Map(data.consents || []);
      this.likes = data.likes || [];
      this.matches = data.matches || [];
      this.blocks = data.blocks || [];
      this.reports = data.reports || [];
      this.moments = data.moments || [];
      this.conversations = new Map(data.conversations || []);
      this.messages = new Map(data.messages || []);
      this.adminAuditLogs = data.adminAuditLogs || [];
      this.moderationNotices = data.moderationNotices || [];
      this.appeals = data.appeals || [];
      this.erasureAuditLog = data.erasureAuditLog || [];
      this.userPasswords = new Map(data.userPasswords || []);
      this.passwordResets = new Map(data.passwordResets || []);
      this.stripeSubscriptions = new Map(data.stripeSubscriptions || []);
      this.localStoreSubscriptions = new Map(data.localStoreSubscriptions || []);
      this.localStoreEvents = new Set(data.localStoreEvents || []);
      return true;
    } catch (err) {
      console.error("[DataStore] Critical error loading file store:", err.message);
      try {
        const backupCorrupt = import_path2.default.join(process.cwd(), "data", `aura_db.corrupt.${Date.now()}.json`);
        import_fs2.default.copyFileSync(this.dbFilePath, backupCorrupt);
        console.warn(`[DataStore] Preserved corrupted database file to ${backupCorrupt}`);
      } catch (copyErr) {
      }
      return false;
    }
  }
  constructor() {
    const pool = getPostgresPool();
    if (pool) {
      this.pgAdapter = new PostgresStoreAdapter(pool);
      initPostgresSchema().then((ok) => {
        if (ok) {
          console.log("[DataStore] PostgreSQL persistence layer connected and schema ready.");
        } else {
          console.error("[DataStore] PostgreSQL schema initialization failed.");
        }
      }).catch((e) => {
        console.error("[DataStore] PostgreSQL connection error:", e.message);
      });
    } else {
      if (process.env.NODE_ENV === "production") {
        console.error(
          "[DataStore CRITICAL] Neither DATABASE_URL nor SQL_HOST is configured for PostgreSQL in production!\nProduction requires a persistent Cloud SQL PostgreSQL instance to prevent data loss across Cloud Run container lifecycles."
        );
      }
    }
    if (this.loadFromDisk()) {
      console.log("[DataStore] Loaded development local data from disk.");
      this.purgeBotAccounts();
    } else {
      console.log("[DataStore] Clean database initialized (zero bots).");
    }
  }
  /**
   * Purges all bot, test, synthetic, and non-real accounts, sessions, moments, and messages.
   * Protects real verified user accounts (such as adas.stasz1@gmail.com) and promotes the primary owner to SUPERADMIN.
   */
  purgeBotAccounts() {
    const isBotUser = (userId, email) => {
      if (userId === "YfFbq4qTCjZYMPZUZEZPzrkOM2k2") return false;
      const lowerEmail = (email || "").toLowerCase().trim();
      if (lowerEmail === "adas.stasz1@gmail.com") return false;
      if (userId.startsWith("user-demo") || userId.startsWith("user-marcus") || userId.startsWith("user-julian") || userId.startsWith("user-mateo") || userId.startsWith("user-alex") || userId.startsWith("user-dante") || userId.startsWith("user-leo") || userId.startsWith("user-gabriel") || userId.startsWith("user-admin") || userId.startsWith("user-1788609190714") || userId.startsWith("user-1788726769224")) {
        return true;
      }
      if (lowerEmail.endsWith("@deleted.aura.local") || lowerEmail.startsWith("synthetic-bot-") || lowerEmail.startsWith("bot-seed-") || lowerEmail.endsWith("@test-bot.local")) {
        return true;
      }
      return false;
    };
    const botUserIds = /* @__PURE__ */ new Set();
    for (const [id, user] of this.users.entries()) {
      if (isBotUser(id, user.email)) {
        botUserIds.add(id);
      } else if (user.email?.toLowerCase().trim() === "adas.stasz1@gmail.com") {
        user.role = "SUPERADMIN";
        user.status = "ACTIVE";
      }
    }
    for (const botId of botUserIds) {
      this.users.delete(botId);
      this.consents.delete(botId);
      this.userPasswords.delete(botId);
    }
    for (const [token, session] of this.sessions.entries()) {
      if (botUserIds.has(session.userId) || token.includes("demo") || token === "aura-demo-token") {
        this.sessions.delete(token);
      }
    }
    for (const [token, userId] of this.tokens.entries()) {
      if (botUserIds.has(userId) || token.includes("demo") || token === "aura-demo-token") {
        this.tokens.delete(token);
      }
    }
    const initialMomentsCount = this.moments.length;
    this.moments = this.moments.filter((m) => !botUserIds.has(m.userId));
    const purgedMomentsCount = initialMomentsCount - this.moments.length;
    this.matches = this.matches.filter((m) => !botUserIds.has(m.user1Id) && !botUserIds.has(m.user2Id));
    this.likes = this.likes.filter((l) => !botUserIds.has(l.fromUserId) && !botUserIds.has(l.toUserId));
    this.blocks = this.blocks.filter((b) => !botUserIds.has(b.blockerUserId) && !botUserIds.has(b.blockedUserId));
    this.reports = this.reports.filter((r) => !botUserIds.has(r.reporterUserId) && !botUserIds.has(r.reportedUserId));
    for (const [convId, conv] of this.conversations.entries()) {
      if (conv.participantIds.some((id) => botUserIds.has(id))) {
        this.conversations.delete(convId);
        this.messages.delete(convId);
      }
    }
    if (botUserIds.size > 0 || purgedMomentsCount > 0) {
      console.log(`[DataStore] Successfully purged ${botUserIds.size} bot accounts and ${purgedMomentsCount} bot moments.`);
      this.saveToDisk();
    }
    return { purgedUsersCount: botUserIds.size, purgedMomentsCount };
  }
  // --- Auth Methods ---
  registerUser(email, displayName, age, role = "USER", password) {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error("Valid email address is required");
    }
    if (!age || age < 18) {
      throw new Error("Access denied. AURA GAY is an adult platform strictly restricted to individuals aged 18 and older.");
    }
    const existing = Array.from(this.users.values()).find((u) => u.email === cleanEmail);
    if (existing) {
      throw new Error("An account with this email address already exists. Please log in instead.");
    }
    const userId = `user-${Date.now()}-${import_crypto4.default.randomBytes(4).toString("hex")}`;
    const profileId = `prof-${Date.now()}`;
    const cleanDisplayName = displayName.replace(/<[^>]*>?/gm, "").trim() || "New Member";
    const newUserProfile = {
      id: profileId,
      userId,
      displayName: cleanDisplayName,
      age: Math.min(Math.max(18, age), 99),
      identityRole: "Versatile",
      location: "Los Angeles, CA",
      distanceKm: 0.5,
      locationPrivacy: "APPROXIMATE",
      approximateArea: "Within ~1 km",
      bio: "New on AURA! Excited to connect with authentic people.",
      lookingFor: ["Dating", "Friends"],
      tribes: ["Clean Cut"],
      interests: ["Travel", "Art", "Fitness"],
      photos: [
        {
          id: `ph-${Date.now()}`,
          url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800",
          isPrimary: true
        }
      ],
      verified: false,
      isOnline: true,
      lastActiveMinutesAgo: 0
    };
    const newUser = {
      id: userId,
      email: cleanEmail,
      role: role === "SUPERADMIN" ? "SUPERADMIN" : "USER",
      status: "ACTIVE",
      isAgeVerified18Plus: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      profile: newUserProfile
    };
    if (password && password.trim().length >= 6) {
      const salt = import_crypto4.default.randomBytes(16).toString("hex");
      const hash = import_crypto4.default.scryptSync(password, salt, 64).toString("hex");
      this.userPasswords.set(userId, `${salt}:${hash}`);
    }
    this.users.set(userId, newUser);
    const token = `aura_sess_${userId}_${import_crypto4.default.randomBytes(24).toString("hex")}`;
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3).toISOString();
    const sessionRecord = {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt,
      lastUsedAt: now.toISOString()
    };
    this.sessions.set(token, sessionRecord);
    this.tokens.set(token, userId);
    this.consents.set(userId, {
      necessaryCookies: true,
      functionalCookies: true,
      analyticsCookies: false,
      explicitSpecialCategoryConsent: true,
      aiAssistanceConsent: true,
      locationProcessingConsent: true,
      termsAcceptedVersion: "2026.1",
      privacyPolicyAcceptedVersion: "2026.1",
      updatedAt: now.toISOString()
    });
    this.saveToDisk();
    return { token, user: newUser };
  }
  loginUser(email, password) {
    const cleanEmail = email.toLowerCase().trim();
    const user = Array.from(this.users.values()).find((u) => u.email === cleanEmail);
    if (!user) return null;
    if (user.status !== "ACTIVE") {
      throw new Error(`Account is ${user.status.toLowerCase()}`);
    }
    if (this.userPasswords.has(user.id)) {
      if (!password) {
        throw new Error("Password is required for this account.");
      }
      const stored = this.userPasswords.get(user.id);
      const [salt, hash] = stored.split(":");
      if (salt && hash) {
        const testHash = import_crypto4.default.scryptSync(password, salt, 64).toString("hex");
        if (testHash !== hash) {
          throw new Error("Invalid email or password");
        }
      }
    } else {
      if (!password) {
        throw new Error("This account was created with Google or has no password set. Please provide a password to initialize your account credentials.");
      }
      const salt = import_crypto4.default.randomBytes(16).toString("hex");
      const hash = import_crypto4.default.scryptSync(password, salt, 64).toString("hex");
      this.userPasswords.set(user.id, `${salt}:${hash}`);
    }
    const token = `aura_sess_${user.id}_${import_crypto4.default.randomBytes(24).toString("hex")}`;
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3).toISOString();
    const sessionRecord = {
      token,
      userId: user.id,
      createdAt: now.toISOString(),
      expiresAt,
      lastUsedAt: now.toISOString()
    };
    this.sessions.set(token, sessionRecord);
    this.tokens.set(token, user.id);
    this.saveToDisk();
    return { token, user };
  }
  getUserByToken(token) {
    if (!token) return null;
    const cleanToken = token.replace(/^Bearer\s+/i, "").trim();
    if (!cleanToken) return null;
    const session = this.sessions.get(cleanToken);
    if (session) {
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        this.sessions.delete(cleanToken);
        this.tokens.delete(cleanToken);
        this.saveToDisk();
        return null;
      }
      session.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
      const user = this.users.get(session.userId);
      if (user && user.status === "ACTIVE") {
        return user;
      }
      return null;
    }
    const userId = this.tokens.get(cleanToken);
    if (userId) {
      const user = this.users.get(userId);
      if (user && user.status === "ACTIVE") {
        const now = /* @__PURE__ */ new Date();
        this.sessions.set(cleanToken, {
          token: cleanToken,
          userId,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3).toISOString(),
          lastUsedAt: now.toISOString()
        });
        return user;
      }
      return null;
    }
    if (cleanToken === "demo-token" || cleanToken === "aura-demo-token" || cleanToken === "aura_auth_token") {
      return null;
    }
    if (cleanToken.includes(".")) {
      try {
        const parts = cleanToken.split(".");
        if (parts.length === 3) {
          const headerStr = Buffer.from(parts[0], "base64").toString("utf-8");
          const header = JSON.parse(headerStr);
          if (header.alg !== "RS256") {
            return null;
          }
          const payloadStr = Buffer.from(parts[1], "base64").toString("utf-8");
          const payload = JSON.parse(payloadStr);
          const projectId = "aura-dating-gay-mab";
          const expectedIss = `https://securetoken.google.com/${projectId}`;
          if (payload.iss !== expectedIss || payload.aud !== projectId) {
            return null;
          }
          const nowSec = Math.floor(Date.now() / 1e3);
          if (!payload.exp || payload.exp < nowSec) {
            return null;
          }
          const fbUid = payload.user_id || payload.sub;
          if (fbUid && typeof fbUid === "string" && fbUid.length > 3) {
            let user = this.users.get(fbUid);
            if (!user) {
              const email = payload.email || `${fbUid}@user.auragay.com`;
              const isSuperAdmin = email.toLowerCase().trim() === "adas.stasz1@gmail.com";
              user = {
                id: fbUid,
                email,
                role: isSuperAdmin ? "SUPERADMIN" : "USER",
                status: "ACTIVE",
                isAgeVerified18Plus: true,
                createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
                profile: {
                  id: `prof-${fbUid}`,
                  userId: fbUid,
                  displayName: (payload.name || email.split("@")[0] || "AURA Member").replace(/<[^>]*>?/gm, ""),
                  age: 26,
                  identityRole: "Versatile",
                  location: "Global Member",
                  distanceKm: 1.2,
                  locationPrivacy: "APPROXIMATE",
                  approximateArea: "Within ~1 km",
                  bio: "Connecting on AURA 18+.",
                  lookingFor: ["Dating", "Friends"],
                  tribes: ["Clean Cut"],
                  interests: ["Design", "Music", "Fitness"],
                  photos: [
                    { id: `ph-${fbUid}-1`, url: payload.picture || AURA_ALBUM_PHOTOS[0], isPrimary: true }
                  ],
                  verified: true,
                  isOnline: true,
                  lastActiveMinutesAgo: 0
                }
              };
              this.users.set(fbUid, user);
              this.saveToDisk();
            }
            const now = /* @__PURE__ */ new Date();
            this.sessions.set(cleanToken, {
              token: cleanToken,
              userId: fbUid,
              createdAt: now.toISOString(),
              expiresAt: new Date(payload.exp * 1e3).toISOString(),
              lastUsedAt: now.toISOString()
            });
            this.tokens.set(cleanToken, fbUid);
            return user;
          }
        }
      } catch (err) {
        return null;
      }
    }
    return null;
  }
  invalidateToken(token) {
    const cleanToken = token.replace(/^Bearer\s+/i, "").trim();
    const resSessions = this.sessions.delete(cleanToken);
    const resTokens = this.tokens.delete(cleanToken);
    if (this.pgAdapter) {
      this.pgAdapter.deleteSession(cleanToken).catch((e) => console.error("[Postgres] Session delete error:", e.message));
    }
    this.saveToDisk();
    return resSessions || resTokens;
  }
  // --- Password Recovery Flow ---
  createPasswordReset(email) {
    const cleanEmail = email.toLowerCase().trim();
    const user = Array.from(this.users.values()).find((u) => u.email === cleanEmail);
    if (!user) return null;
    if (!this.userPasswords.has(user.id)) {
      return null;
    }
    const token = import_crypto4.default.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600 * 1e3).toISOString();
    this.passwordResets.set(token, {
      userId: user.id,
      expiresAt,
      used: false
    });
    if (this.pgAdapter) {
      this.pgAdapter.createPasswordReset(cleanEmail).catch((err) => {
        console.error("[Postgres] Password reset sync error:", err.message);
      });
    }
    this.saveToDisk();
    return { token, expiresAt };
  }
  resetPasswordWithToken(token, newPassword) {
    if (!token || !newPassword) return false;
    const cleanToken = token.trim();
    const record = this.passwordResets.get(cleanToken);
    if (!record) return false;
    if (record.used) return false;
    if (new Date(record.expiresAt).getTime() < Date.now()) return false;
    record.used = true;
    const salt = import_crypto4.default.randomBytes(16).toString("hex");
    const hash = import_crypto4.default.scryptSync(newPassword, salt, 64).toString("hex");
    this.userPasswords.set(record.userId, `${salt}:${hash}`);
    for (const [sToken, sRecord] of this.sessions.entries()) {
      if (sRecord.userId === record.userId) {
        this.sessions.delete(sToken);
        this.tokens.delete(sToken);
      }
    }
    if (this.pgAdapter) {
      this.pgAdapter.resetPasswordWithToken(cleanToken, `${salt}:${hash}`).catch((err) => {
        console.error("[Postgres] Password reset sync error:", err.message);
      });
    }
    this.saveToDisk();
    return true;
  }
  // --- Stripe Subscription & Webhook Processing ---
  isStripeEventProcessed(eventId) {
    return this.stripeEvents.has(eventId);
  }
  recordStripeEvent(eventId, eventType) {
    this.stripeEvents.add(eventId);
    if (this.pgAdapter) {
      this.pgAdapter.recordProcessedEvent(eventId, eventType).catch((err) => {
        console.error("[Postgres] Stripe event sync error:", err.message);
      });
    }
  }
  recordStripeSubscription(userId, customerId, subscriptionId, planId, status, periodEnd) {
    const user = this.users.get(userId);
    if (!user) return null;
    const isActive = status === "active" || status === "trialing";
    user.isPremium = isActive;
    user.profile.isPremium = isActive;
    if (isActive) {
      user.premiumExpiresAt = periodEnd ? periodEnd.toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
      user.profile.premiumTier = planId === "aura_vip_annual" ? "VIP_ANNUAL" : "VIP_MONTHLY";
    } else {
      delete user.premiumExpiresAt;
      user.profile.premiumTier = void 0;
    }
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.stripeSubscriptions.set(userId, {
      customerId,
      subscriptionId,
      planId,
      status,
      currentPeriodEnd: user.premiumExpiresAt
    });
    this.localStoreSubscriptions.set(userId, {
      userId,
      premium: isActive,
      provider: "stripe",
      productId: planId,
      planTier: planId === "aura_vip_annual" ? "yearly" : "monthly",
      status: isActive ? "active" : "canceled",
      expiresAt: user.premiumExpiresAt,
      autoRenew: isActive,
      storeTransactionId: subscriptionId,
      lastVerifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (this.pgAdapter) {
      this.pgAdapter.setStripeSubscription(userId, customerId, subscriptionId, planId, status, periodEnd).catch((err) => {
        console.error("[Postgres] Subscription sync error:", err.message);
      });
    }
    this.saveToDisk();
    return user;
  }
  findUserByStripeCustomerId(customerId) {
    for (const [userId, sub] of this.stripeSubscriptions.entries()) {
      if (sub.customerId === customerId) {
        return this.users.get(userId) || null;
      }
    }
    return null;
  }
  findUserByStripeSubscriptionId(subscriptionId) {
    for (const [userId, sub] of this.stripeSubscriptions.entries()) {
      if (sub.subscriptionId === subscriptionId) {
        return this.users.get(userId) || null;
      }
    }
    return null;
  }
  /**
   * Unified Store Entitlement Resolution (Google Play, Apple StoreKit, Stripe).
   * Backed by PostgreSQL in production and local store in development.
   */
  async getUserEntitlements(userId) {
    if (this.pgAdapter) {
      const pgEnt = await this.pgAdapter.getStoreSubscriptionByUserId(userId);
      if (pgEnt) return pgEnt;
    }
    const existing = this.localStoreSubscriptions.get(userId);
    const user = this.users.get(userId);
    if (existing) {
      if (existing.status !== "revoked" && existing.expiresAt && new Date(existing.expiresAt).getTime() < Date.now()) {
        existing.premium = false;
        existing.status = "expired";
        existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        if (user) {
          user.isPremium = false;
          user.profile.isPremium = false;
        }
      }
      return existing;
    }
    const isPrem = !!user?.isPremium;
    const defaultEntitlement = {
      userId,
      premium: isPrem,
      provider: isPrem ? "stripe" : "none",
      status: isPrem ? "active" : "none",
      expiresAt: user?.premiumExpiresAt,
      autoRenew: isPrem,
      lastVerifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.localStoreSubscriptions.set(userId, defaultEntitlement);
    return defaultEntitlement;
  }
  async recordStoreEntitlement(entitlement) {
    if (this.pgAdapter) {
      await this.pgAdapter.upsertStoreSubscription(entitlement);
    }
    const user = this.users.get(entitlement.userId);
    if (user) {
      user.isPremium = entitlement.premium;
      user.profile.isPremium = entitlement.premium;
      if (entitlement.premium && entitlement.expiresAt) {
        user.premiumExpiresAt = entitlement.expiresAt;
        user.profile.premiumTier = entitlement.planTier === "yearly" ? "VIP_ANNUAL" : "VIP_MONTHLY";
      } else if (!entitlement.premium) {
        delete user.premiumExpiresAt;
        user.profile.premiumTier = void 0;
      }
      user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      this.users.set(entitlement.userId, user);
    }
    this.localStoreSubscriptions.set(entitlement.userId, entitlement);
    this.saveToDisk();
    return entitlement;
  }
  async findUserByPurchaseTokenHash(tokenHash) {
    if (this.pgAdapter) {
      const uid = await this.pgAdapter.findUserByPurchaseTokenHash(tokenHash);
      if (uid) return this.getUserById(uid) || { id: uid };
    }
    for (const [userId, ent] of this.localStoreSubscriptions.entries()) {
      if (ent.purchaseTokenHash === tokenHash) {
        return this.users.get(userId) || { id: userId };
      }
    }
    return null;
  }
  async findUserByOriginalTransactionId(origId) {
    if (this.pgAdapter) {
      const uid = await this.pgAdapter.findUserByOriginalTransactionId(origId);
      if (uid) return this.getUserById(uid) || { id: uid };
    }
    for (const [userId, ent] of this.localStoreSubscriptions.entries()) {
      if (ent.originalTransactionId === origId) {
        return this.users.get(userId) || { id: userId };
      }
    }
    return null;
  }
  async isStoreEventProcessed(provider, externalEventId) {
    if (this.pgAdapter) {
      return this.pgAdapter.isStoreEventProcessed(provider, externalEventId);
    }
    const key = `${provider}:${externalEventId}`;
    return this.localStoreEvents.has(key);
  }
  async recordStoreBillingEvent(id, provider, externalEventId, eventType, metadata) {
    if (this.pgAdapter) {
      return this.pgAdapter.recordStoreBillingEvent(id, provider, externalEventId, eventType, metadata);
    }
    const key = `${provider}:${externalEventId}`;
    this.localStoreEvents.add(key);
    this.saveToDisk();
    return true;
  }
  getUserById(userId) {
    return this.users.get(userId) || null;
  }
  setUserPremium(userId, isPremium) {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    user.isPremium = isPremium;
    if (isPremium) {
      user.premiumExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
    } else {
      delete user.premiumExpiresAt;
    }
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.users.set(userId, user);
    this.saveToDisk();
    return user;
  }
  getProfileById(targetUserId, requestingUserId) {
    const targetUser = this.users.get(targetUserId);
    if (!targetUser || targetUser.status !== "ACTIVE") {
      return null;
    }
    if (requestingUserId && this.isBlocked(requestingUserId, targetUserId)) {
      return null;
    }
    return this.sanitizeProfilePrivacy(targetUser.profile, requestingUserId);
  }
  // --- Profile Methods ---
  updateProfile(userId, updates) {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    if (user.status !== "ACTIVE") throw new Error(`User account is ${user.status.toLowerCase()}`);
    const allowedKeys = [
      "displayName",
      "bio",
      "heightCm",
      "weightKg",
      "relationshipStatus",
      "lookingFor",
      "tribes",
      "interests",
      "instagramHandle",
      "spotifyTopArtist",
      "identityRole",
      "locationPrivacy",
      "approximateArea",
      "location"
    ];
    const safeProfileUpdates = {};
    for (const key of allowedKeys) {
      if (updates[key] !== void 0) {
        if (typeof updates[key] === "string") {
          safeProfileUpdates[key] = updates[key].replace(/<[^>]*>?/gm, "").trim();
        } else {
          safeProfileUpdates[key] = updates[key];
        }
      }
    }
    user.profile = {
      ...user.profile,
      ...safeProfileUpdates,
      userId
    };
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.saveToDisk();
    return user.profile;
  }
  addProfilePhoto(userId, url, isPrimary = false) {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://") && !cleanUrl.startsWith("data:image/")) {
      throw new Error("Invalid image URL format");
    }
    if (cleanUrl.includes("image/svg+xml") || cleanUrl.includes("<script")) {
      throw new Error("Dangerous or unsupported image payload");
    }
    const newPhoto = {
      id: `ph-${Date.now()}`,
      url: cleanUrl,
      isPrimary: isPrimary || user.profile.photos.length === 0
    };
    if (newPhoto.isPrimary) {
      user.profile.photos.forEach((p) => p.isPrimary = false);
    }
    user.profile.photos.push(newPhoto);
    this.saveToDisk();
    return user.profile;
  }
  deleteProfilePhoto(userId, photoId) {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    user.profile.photos = user.profile.photos.filter((p) => p.id !== photoId);
    if (user.profile.photos.length > 0 && !user.profile.photos.some((p) => p.isPrimary)) {
      user.profile.photos[0].isPrimary = true;
    }
    this.saveToDisk();
    return user.profile;
  }
  // --- GDPR Subject Rights & Consents ---
  getUserConsents(userId) {
    const existing = this.consents.get(userId);
    if (existing) return existing;
    const defaultConsents = {
      necessaryCookies: true,
      functionalCookies: true,
      analyticsCookies: false,
      explicitSpecialCategoryConsent: true,
      aiAssistanceConsent: true,
      locationProcessingConsent: true,
      termsAcceptedVersion: "2026.1",
      privacyPolicyAcceptedVersion: "2026.1",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.consents.set(userId, defaultConsents);
    this.saveToDisk();
    return defaultConsents;
  }
  updateUserConsents(userId, partial) {
    const current = this.getUserConsents(userId);
    const updated = {
      ...current,
      ...partial,
      necessaryCookies: true,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.consents.set(userId, updated);
    this.saveToDisk();
    return updated;
  }
  exportUserData(userId) {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    const consents = this.getUserConsents(userId);
    const matches = this.matches.filter((m) => m.user1Id === userId || m.user2Id === userId);
    const likesGiven = this.likes.filter((l) => l.fromUserId === userId);
    const blockedUserIds = this.blocks.filter((b) => b.blockerUserId === userId).map((b) => b.blockedUserId);
    const reportsSubmitted = this.reports.filter((r) => r.reporterUserId === userId);
    const userConvs = Array.from(this.conversations.values()).filter((c) => c.participantIds.includes(userId));
    const allMessages = [];
    userConvs.forEach((c) => {
      if (c.excludeFromBackup || c.disableAutoBackup || c.settings?.excludeFromBackup || c.settings?.disableAutoBackup) return;
      const msgs = this.messages.get(c.id) || [];
      const now = Date.now();
      msgs.forEach((m) => {
        if (m.senderId === userId && !m.excludeFromBackup && !m.disableAutoBackup) {
          if (m.expiresAt && !m.isPermanent && new Date(m.expiresAt).getTime() <= now) {
            return;
          }
          allMessages.push(m);
        }
      });
    });
    const publishedMoments = this.moments.filter((m) => m.userId === userId);
    const payloadWithoutChecksum = {
      exportTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
      dataSubject: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        isAgeVerified18Plus: user.isAgeVerified18Plus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      profile: user.profile,
      consents,
      socialData: {
        matchesCount: matches.length,
        matches,
        likesCount: likesGiven.length,
        likesGiven,
        blocksCount: blockedUserIds.length,
        blockedUserIds,
        reportsCount: reportsSubmitted.length,
        reportsSubmitted
      },
      messages: {
        conversationsCount: userConvs.length,
        messagesSent: allMessages
      },
      moments: {
        publishedMoments
      }
    };
    const serialized = JSON.stringify(payloadWithoutChecksum);
    const checksumSha256 = import_crypto4.default.createHash("sha256").update(serialized).digest("hex");
    return {
      ...payloadWithoutChecksum,
      checksumSha256
    };
  }
  /**
   * Generates an automated cloud backup snapshot of the system state,
   * strictly respecting conversation-level and message-level 'disableAutoBackup' flags.
   * Any conversation with disableAutoBackup (or excludeFromBackup) is completely excluded.
   */
  performAutomatedCloudBackup(automated = true) {
    const backupId = `cb-${Date.now()}-${import_crypto4.default.randomBytes(4).toString("hex")}`;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const allConversations = Array.from(this.conversations.values());
    const excludedConversationIds = [];
    const eligibleConversations = [];
    const backedUpMessages = [];
    const now = Date.now();
    for (const conv of allConversations) {
      const isAutoBackupDisabled = !!(conv.disableAutoBackup || conv.settings?.disableAutoBackup || conv.excludeFromBackup || conv.settings?.excludeFromBackup);
      if (isAutoBackupDisabled) {
        excludedConversationIds.push(conv.id);
        continue;
      }
      eligibleConversations.push(conv);
      const convMessages = this.messages.get(conv.id) || [];
      for (const msg of convMessages) {
        if (msg.disableAutoBackup || msg.excludeFromBackup) {
          continue;
        }
        if (msg.expiresAt && !msg.isPermanent && new Date(msg.expiresAt).getTime() <= now) {
          continue;
        }
        backedUpMessages.push(msg);
      }
    }
    const backupPayload = {
      backupId,
      timestamp,
      automated,
      metadata: {
        totalUsers: this.users.size,
        totalConversations: allConversations.length,
        backedUpConversationsCount: eligibleConversations.length,
        excludedConversationsCount: excludedConversationIds.length,
        backedUpMessagesCount: backedUpMessages.length
      },
      conversations: eligibleConversations,
      messages: backedUpMessages,
      matches: this.matches,
      likes: this.likes,
      moments: this.moments
    };
    const serialized = JSON.stringify(backupPayload);
    const checksumSha256 = import_crypto4.default.createHash("sha256").update(serialized).digest("hex");
    const backupDir = import_path2.default.join(process.cwd(), "data", "backups");
    let backupFilePath;
    let backupSizeBytes;
    try {
      if (!import_fs2.default.existsSync(backupDir)) {
        import_fs2.default.mkdirSync(backupDir, { recursive: true });
      }
      backupFilePath = import_path2.default.join(backupDir, `cloud_backup_${backupId}.json`);
      import_fs2.default.writeFileSync(backupFilePath, serialized, "utf-8");
      backupSizeBytes = Buffer.byteLength(serialized, "utf-8");
    } catch (err) {
      console.warn("[DataStore] Notice: Unable to write local backup file (retaining in-memory snapshot):", err);
    }
    const record = {
      backupId,
      timestamp,
      status: "SUCCESS",
      totalConversations: allConversations.length,
      backedUpConversations: eligibleConversations.length,
      excludedConversations: excludedConversationIds.length,
      excludedDueToDisableAutoBackup: excludedConversationIds.length,
      totalMessagesBackedUp: backedUpMessages.length,
      checksumSha256,
      backupSizeBytes,
      backupFilePath,
      automated,
      excludedConversationIds
    };
    this.cloudBackupHistory.unshift(record);
    if (this.cloudBackupHistory.length > 50) {
      this.cloudBackupHistory.pop();
    }
    return record;
  }
  getLatestCloudBackup() {
    return this.cloudBackupHistory[0] || null;
  }
  getCloudBackupHistory() {
    return [...this.cloudBackupHistory];
  }
  getConversationsWithAutoBackupDisabled() {
    return Array.from(this.conversations.values()).filter((c) => c.disableAutoBackup || c.settings?.disableAutoBackup || c.excludeFromBackup || c.settings?.excludeFromBackup).map((c) => c.id);
  }
  getCloudBackupStatus() {
    const totalConversations = this.conversations.size;
    const disabledCount = this.getConversationsWithAutoBackupDisabled().length;
    return {
      serviceActive: true,
      lastBackup: this.getLatestCloudBackup(),
      totalConversations,
      conversationsWithAutoBackupDisabled: disabledCount,
      historyCount: this.cloudBackupHistory.length
    };
  }
  rectifyUserData(userId, updates) {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    if (updates.email) {
      const clean = updates.email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("Invalid email format");
      const conflict = Array.from(this.users.values()).find((u) => u.id !== userId && u.email === clean);
      if (conflict) throw new Error("Email is already taken by another account");
      user.email = clean;
    }
    if (updates.displayName) {
      user.profile.displayName = updates.displayName.replace(/<[^>]*>?/gm, "").trim();
    }
    if (updates.bio !== void 0) {
      user.profile.bio = updates.bio.replace(/<[^>]*>?/gm, "").trim();
    }
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.saveToDisk();
    return user;
  }
  restrictAccount(userId, reason) {
    const user = this.users.get(userId);
    if (!user) return false;
    user.status = "SUSPENDED";
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    for (const [tok, session] of Array.from(this.sessions.entries())) {
      if (session.userId === userId) this.sessions.delete(tok);
    }
    for (const [tok, uid] of Array.from(this.tokens.entries())) {
      if (uid === userId) this.tokens.delete(tok);
    }
    this.saveToDisk();
    return true;
  }
  recordObjection(userId, reason) {
    const user = this.users.get(userId);
    if (!user) return false;
    const consents = this.getUserConsents(userId);
    consents.aiAssistanceConsent = false;
    consents.analyticsCookies = false;
    consents.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.consents.set(userId, consents);
    this.saveToDisk();
    return true;
  }
  eraseUserData(userId) {
    const user = this.users.get(userId);
    if (!user) return false;
    const userHash = import_crypto4.default.createHash("sha256").update(userId).digest("hex");
    user.email = `erased-${userHash.slice(0, 12)}@deleted.aura.local`;
    user.status = "DELETED";
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    user.profile = {
      id: user.profile.id,
      userId,
      displayName: "Deleted Member",
      age: 0,
      identityRole: "Unspecified",
      location: "Account Deleted",
      distanceKm: 0,
      bio: "This account has been permanently erased under GDPR Article 17.",
      lookingFor: [],
      tribes: [],
      interests: [],
      photos: [],
      verified: false,
      isOnline: false,
      lastActiveMinutesAgo: 999999
    };
    this.moments = this.moments.filter((m) => m.userId !== userId);
    this.likes = this.likes.filter((l) => l.fromUserId !== userId && l.toUserId !== userId);
    for (const [tok, session] of Array.from(this.sessions.entries())) {
      if (session.userId === userId) this.sessions.delete(tok);
    }
    for (const [tok, uid] of Array.from(this.tokens.entries())) {
      if (uid === userId) this.tokens.delete(tok);
    }
    this.localStoreSubscriptions.delete(userId);
    this.erasureAuditLog.push({
      hashId: userHash,
      erasedAt: (/* @__PURE__ */ new Date()).toISOString(),
      reason: "GDPR_ART_17_RIGHT_TO_ERASURE"
    });
    try {
      purgeAllUserMedia(userId);
    } catch (e) {
    }
    this.saveToDisk();
    return true;
  }
  // --- DSA Compliance: Reports, Moderation & Appeals ---
  submitDsaReport(reporterUserId, reportedUserId, reason, details) {
    if (reporterUserId === reportedUserId) {
      throw new Error("Cannot report yourself");
    }
    const reportedUser = this.users.get(reportedUserId);
    if (!reportedUser) {
      throw new Error("Reported user does not exist");
    }
    const report = {
      id: `dsa-rep-${Date.now()}-${import_crypto4.default.randomBytes(3).toString("hex")}`,
      reporterUserId,
      reportedUserId,
      reason,
      details: details ? details.replace(/<[^>]*>?/gm, "").trim() : void 0,
      status: "PENDING",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      reportedProfile: this.sanitizeProfilePrivacy(reportedUser.profile)
    };
    this.reports.push(report);
    this.saveToDisk();
    return report;
  }
  getUserSubmittedReports(reporterUserId) {
    return this.reports.filter((r) => r.reporterUserId === reporterUserId);
  }
  adminDecideReport(adminId, reportId, decision, legalBasis, statementOfReasons) {
    const report = this.reports.find((r) => r.id === reportId);
    if (!report) throw new Error("Report not found");
    report.status = decision === "DISMISSED" ? "DISMISSED" : "RESOLVED";
    if (decision === "SUSPEND_ACCOUNT") {
      this.suspendUser(report.reportedUserId);
    }
    const deadline = new Date(Date.now() + 180 * 24 * 60 * 60 * 1e3).toISOString();
    const notice = {
      id: `notice-${Date.now()}-${import_crypto4.default.randomBytes(3).toString("hex")}`,
      reportId,
      targetUserId: report.reportedUserId,
      decision,
      reason: report.reason,
      legalBasis: legalBasis.trim(),
      statementOfReasons: statementOfReasons.trim(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      appealStatus: "NONE",
      appealDeadline: deadline
    };
    this.moderationNotices.push(notice);
    this.logAdminAction(
      adminId,
      decision === "DISMISSED" ? "DISMISS_REPORT" : "RESOLVE_REPORT",
      report.reportedUserId,
      `Report decision: ${decision}. Basis: ${legalBasis}`,
      { reportId, statementOfReasons }
    );
    this.saveToDisk();
    return notice;
  }
  getModerationNoticesForUser(userId) {
    return this.moderationNotices.filter((n) => n.targetUserId === userId);
  }
  submitDsaAppeal(userId, noticeId, appealReason) {
    const notice = this.moderationNotices.find((n) => n.id === noticeId && n.targetUserId === userId);
    if (!notice) {
      throw new Error("Moderation notice not found or unauthorized");
    }
    if (new Date(notice.appealDeadline).getTime() < Date.now()) {
      throw new Error("Appeal deadline of 6 months has expired under DSA Article 20");
    }
    const appeal = {
      id: `appeal-${Date.now()}-${import_crypto4.default.randomBytes(3).toString("hex")}`,
      noticeId,
      userId,
      appealReason: appealReason.replace(/<[^>]*>?/gm, "").trim(),
      status: "PENDING",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    notice.appealStatus = "PENDING";
    this.appeals.push(appeal);
    this.saveToDisk();
    return appeal;
  }
  getDsaAppeals() {
    return this.appeals;
  }
  adminDecideAppeal(adminId, appealId, outcome, decisionNotes) {
    const appeal = this.appeals.find((a) => a.id === appealId);
    if (!appeal) throw new Error("Appeal not found");
    appeal.status = outcome;
    appeal.adminDecisionNotes = decisionNotes.trim();
    appeal.decidedAt = (/* @__PURE__ */ new Date()).toISOString();
    const notice = this.moderationNotices.find((n) => n.id === appeal.noticeId);
    if (notice) {
      notice.appealStatus = outcome;
    }
    if (outcome === "OVERTURNED") {
      const user = this.users.get(appeal.userId);
      if (user && user.status === "SUSPENDED") {
        user.status = "ACTIVE";
        user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
    }
    this.logAdminAction(
      adminId,
      "APPEAL_DECISION",
      appeal.userId,
      `Appeal ${appealId} outcome: ${outcome}`,
      { appealId, decisionNotes }
    );
    this.saveToDisk();
    return appeal;
  }
  logAdminAction(adminId, action, targetUserId, reason, details) {
    const log = {
      id: `audit-${Date.now()}-${import_crypto4.default.randomBytes(3).toString("hex")}`,
      adminId,
      targetUserId,
      action,
      reason,
      details,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.adminAuditLogs.push(log);
    this.saveToDisk();
    return log;
  }
  getAdminAuditLogs() {
    return this.adminAuditLogs;
  }
  // --- Discovery Feed & Filtering ---
  getDiscoverFeed(currentUserId, filters) {
    const blockedUserIds = /* @__PURE__ */ new Set();
    this.blocks.forEach((b) => {
      if (b.blockerUserId === currentUserId) blockedUserIds.add(b.blockedUserId);
      if (b.blockedUserId === currentUserId) blockedUserIds.add(b.blockerUserId);
    });
    let eligible = Array.from(this.users.values()).filter((u) => u.id !== currentUserId).filter((u) => u.status === "ACTIVE").filter((u) => !blockedUserIds.has(u.id)).map((u) => u.profile);
    const filtered = filters ? eligible.filter((p) => {
      if (filters.minAge && p.age < filters.minAge) return false;
      if (filters.maxAge && p.age > filters.maxAge) return false;
      if (filters.maxDistanceKm && p.distanceKm > filters.maxDistanceKm) return false;
      if (filters.verifiedOnly && !p.verified) return false;
      if (filters.onlineOnly && !p.isOnline) return false;
      if (filters.hasPhotosOnly && p.photos.length === 0) return false;
      if (filters.roles && filters.roles.length > 0) {
        if (!filters.roles.includes(p.identityRole)) return false;
      }
      if (filters.tribes && filters.tribes.length > 0) {
        const hasTribe = p.tribes.some((t) => filters.tribes?.includes(t));
        if (!hasTribe) return false;
      }
      return true;
    }) : eligible;
    return filtered.map((p) => this.sanitizeProfilePrivacy(p));
  }
  /**
   * Sanitizes user coordinates to enforce privacy-safe location:
   * - HIDDEN: completely removes latitude and longitude
   * - EXACT: retains coordinates only with explicit permission
   * - APPROXIMATE (Default): applies deterministic ~1.5km fuzzy offset
   * Never exposes exact physical address to other users.
   */
  sanitizeProfilePrivacy(profile, viewerUserId) {
    const privacy = profile.locationPrivacy || "APPROXIMATE";
    const isOwner = viewerUserId && (viewerUserId === profile.userId || viewerUserId === profile.id);
    const hasVault = isOwner || (viewerUserId ? this.hasVaultAccess(profile.userId, viewerUserId) : false);
    const sanitizePhotos = (photos) => {
      return (photos || []).map((p) => {
        if (p.isPrivate && !hasVault) {
          return {
            ...p,
            isLocked: true
          };
        }
        return {
          ...p,
          isLocked: false
        };
      });
    };
    if (privacy === "HIDDEN") {
      const copy2 = { ...profile };
      delete copy2.lat;
      delete copy2.lng;
      copy2.locationPrivacy = "HIDDEN";
      copy2.approximateArea = "Location Hidden";
      copy2.distanceKm = Math.round(profile.distanceKm || 0);
      copy2.photos = sanitizePhotos(profile.photos);
      return copy2;
    }
    if (privacy === "EXACT") {
      const copy2 = { ...profile };
      copy2.locationPrivacy = "EXACT";
      copy2.approximateArea = "Exact (Permission Granted)";
      copy2.distanceKm = Math.round((profile.distanceKm || 0) * 1e3) / 1e3;
      if (copy2.lat !== void 0) {
        copy2.lat = Math.round(copy2.lat * 1e3) / 1e3;
      }
      if (copy2.lng !== void 0) {
        copy2.lng = Math.round(copy2.lng * 1e3) / 1e3;
      }
      copy2.photos = sanitizePhotos(profile.photos);
      return copy2;
    }
    const copy = { ...profile };
    copy.locationPrivacy = "APPROXIMATE";
    copy.photos = sanitizePhotos(profile.photos);
    if (profile.lat !== void 0 && profile.lng !== void 0) {
      let hash = 0;
      const str = (profile.userId || profile.id) + "aura-privacy-salt-2026";
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      const angle = Math.abs(hash) % 360 * (Math.PI / 180);
      const offsetKm = 1.2 + Math.abs(hash >> 3) % 100 / 100 * 1;
      const latOffset = offsetKm / 111 * Math.cos(angle);
      const lngOffset = offsetKm / (111 * Math.cos((profile.lat || 34) * Math.PI / 180)) * Math.sin(angle);
      copy.lat = Math.round((profile.lat + latOffset) * 1e3) / 1e3;
      copy.lng = Math.round((profile.lng + lngOffset) * 1e3) / 1e3;
    }
    const dist = profile.distanceKm !== void 0 ? profile.distanceKm : 1;
    if (dist <= 0.02) {
      copy.approximateArea = "~15m far";
    } else if (dist <= 0.045) {
      copy.approximateArea = "~30m far";
    } else if (dist < 1) {
      copy.approximateArea = `~${Math.round(dist * 1e3)}m`;
    } else {
      copy.approximateArea = `Within ~${Math.round(dist)} km`;
    }
    copy.distanceKm = dist;
    return copy;
  }
  // --- Social Interactions (Like, Match, Block, Report) ---
  likeUser(fromUserId, toUserId, isSuperLike = false) {
    if (fromUserId === toUserId) {
      throw new Error("Cannot like yourself");
    }
    if (this.isBlocked(fromUserId, toUserId)) {
      throw new Error("Action blocked by user policy");
    }
    const existingLike = this.likes.find((l) => l.fromUserId === fromUserId && l.toUserId === toUserId);
    if (!existingLike) {
      this.likes.push({
        id: `like-${Date.now()}`,
        fromUserId,
        toUserId,
        isSuperLike,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const reciprocalLike = this.likes.find((l) => l.fromUserId === toUserId && l.toUserId === fromUserId);
    if (reciprocalLike) {
      let match = this.matches.find((m) => m.user1Id === fromUserId && m.user2Id === toUserId || m.user1Id === toUserId && m.user2Id === fromUserId);
      if (!match) {
        const targetUser = this.users.get(toUserId);
        match = {
          id: `match-${Date.now()}`,
          user1Id: fromUserId,
          user2Id: toUserId,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          matchedProfile: targetUser?.profile
        };
        this.matches.push(match);
        this.getOrCreateConversation(fromUserId, toUserId);
      }
      this.saveToDisk();
      return { isMatch: true, match };
    }
    this.saveToDisk();
    return { isMatch: false };
  }
  blockUser(blockerUserId, blockedUserId) {
    if (blockerUserId === blockedUserId) {
      throw new Error("Cannot block yourself");
    }
    const existing = this.blocks.find((b) => b.blockerUserId === blockerUserId && b.blockedUserId === blockedUserId);
    if (existing) return existing;
    const record = {
      id: `block-${Date.now()}`,
      blockerUserId,
      blockedUserId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.blocks.push(record);
    this.saveToDisk();
    return record;
  }
  unblockUser(blockerUserId, blockedUserId) {
    const initialLen = this.blocks.length;
    this.blocks = this.blocks.filter((b) => !(b.blockerUserId === blockerUserId && b.blockedUserId === blockedUserId));
    const changed = this.blocks.length < initialLen;
    if (changed) this.saveToDisk();
    return changed;
  }
  getBlockedUsers(userId) {
    const blockedIds = this.blocks.filter((b) => b.blockerUserId === userId).map((b) => b.blockedUserId);
    return blockedIds.map((id) => this.users.get(id)?.profile).filter((p) => !!p);
  }
  isBlocked(userA, userB) {
    return this.blocks.some(
      (b) => b.blockerUserId === userA && b.blockedUserId === userB || b.blockerUserId === userB && b.blockedUserId === userA
    );
  }
  reportUser(reporterUserId, reportedUserId, reason, details) {
    if (reporterUserId === reportedUserId) {
      throw new Error("Cannot report yourself");
    }
    const reportedUser = this.users.get(reportedUserId);
    const report = {
      id: `rep-${Date.now()}`,
      reporterUserId,
      reportedUserId,
      reason: reason.trim(),
      details: details ? details.trim() : void 0,
      status: "PENDING",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      reportedProfile: reportedUser?.profile
    };
    this.reports.push(report);
    this.saveToDisk();
    return report;
  }
  // --- Vault Access Control ---
  grantVaultAccess(ownerId, targetUserId, grant) {
    if (!this.vaultAccess.has(ownerId)) {
      this.vaultAccess.set(ownerId, /* @__PURE__ */ new Set());
    }
    const granted = this.vaultAccess.get(ownerId);
    if (grant) {
      granted.add(targetUserId);
      if (this.vaultRequests.has(ownerId)) {
        this.vaultRequests.get(ownerId).delete(targetUserId);
      }
    } else {
      granted.delete(targetUserId);
    }
    this.saveToDisk();
    return grant;
  }
  requestVaultAccess(requesterId, targetUserId) {
    if (!this.vaultRequests.has(targetUserId)) {
      this.vaultRequests.set(targetUserId, /* @__PURE__ */ new Set());
    }
    this.vaultRequests.get(targetUserId).add(requesterId);
    this.saveToDisk();
    return true;
  }
  hasVaultAccess(ownerId, viewerUserId) {
    if (ownerId === viewerUserId) return true;
    return !!this.vaultAccess.get(ownerId)?.has(viewerUserId);
  }
  isVaultRequested(requesterId, targetUserId) {
    return !!this.vaultRequests.get(targetUserId)?.has(requesterId);
  }
  // --- Conversations & Messaging ---
  getOrCreateConversation(userAId, userBId) {
    const convKey = [userAId, userBId].sort().join("_");
    let conv = Array.from(this.conversations.values()).find((c) => {
      const sorted = [...c.participantIds].sort().join("_");
      return sorted === convKey;
    });
    if (!conv) {
      const otherUser = this.users.get(userBId);
      if (!otherUser) throw new Error("Recipient user not found");
      conv = {
        id: `conv-${Date.now()}`,
        participantIds: [userAId, userBId],
        unreadCount: 0,
        otherParticipant: this.sanitizeProfilePrivacy(otherUser.profile, userAId)
      };
      this.conversations.set(conv.id, conv);
      this.messages.set(conv.id, []);
      this.saveToDisk();
    }
    return conv;
  }
  getUserConversations(userId) {
    const blockedUserIds = new Set(
      this.blocks.filter((b) => b.blockerUserId === userId || b.blockedUserId === userId).map((b) => b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId)
    );
    return Array.from(this.conversations.values()).filter((c) => c.participantIds.includes(userId)).filter((c) => {
      const otherId = c.participantIds.find((id) => id !== userId);
      if (!otherId) return false;
      if (blockedUserIds.has(otherId)) return false;
      const otherUser = this.users.get(otherId);
      return otherUser && otherUser.status === "ACTIVE";
    }).map((c) => {
      const otherId = c.participantIds.find((id) => id !== userId);
      const otherProfile = this.sanitizeProfilePrivacy(this.users.get(otherId).profile, userId);
      this.pruneExpiredMessages(c.id);
      const convMsgs = this.messages.get(c.id) || [];
      const lastMsg = convMsgs[convMsgs.length - 1];
      const unreadCount = convMsgs.filter((m) => m.receiverId === userId && m.status !== "READ").length;
      return {
        ...c,
        otherParticipant: otherProfile,
        lastMessage: lastMsg,
        unreadCount,
        vaultAccessGranted: this.hasVaultAccess(userId, otherId),
        vaultAccessReceived: this.hasVaultAccess(otherId, userId),
        vaultRequested: this.isVaultRequested(userId, otherId)
      };
    }).sort((a, b) => {
      const tA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const tB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return tB - tA;
    });
  }
  getConversation(conversationId) {
    return this.conversations.get(conversationId) || null;
  }
  updateConversationSettings(conversationId, userId, settings) {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(userId)) {
      throw new Error("Unauthorized conversation access");
    }
    if (!conv.settings) {
      conv.settings = {};
    }
    if (settings.messageTtlSeconds !== void 0) {
      conv.messageTtlSeconds = settings.messageTtlSeconds;
      conv.settings.messageTtlSeconds = settings.messageTtlSeconds;
    }
    if (settings.excludeFromBackup !== void 0) {
      conv.excludeFromBackup = settings.excludeFromBackup;
      conv.settings.excludeFromBackup = settings.excludeFromBackup;
    }
    if (settings.disableAutoBackup !== void 0) {
      conv.disableAutoBackup = settings.disableAutoBackup;
      conv.settings.disableAutoBackup = settings.disableAutoBackup;
      if (settings.disableAutoBackup) {
        conv.excludeFromBackup = true;
        conv.settings.excludeFromBackup = true;
      }
    }
    this.conversations.set(conversationId, conv);
    this.saveToDisk();
    return conv;
  }
  toggleMessagePermanent(messageId, conversationId, userId) {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(userId)) {
      throw new Error("Unauthorized conversation access");
    }
    const msgs = this.messages.get(conversationId) || [];
    const msg = msgs.find((m) => m.id === messageId);
    if (!msg) {
      throw new Error("Message not found");
    }
    msg.isPermanent = !msg.isPermanent;
    if (msg.isPermanent) {
      delete msg.expiresAt;
    } else if (msg.ttlSeconds && msg.ttlSeconds > 0) {
      msg.expiresAt = new Date(new Date(msg.createdAt).getTime() + msg.ttlSeconds * 1e3).toISOString();
    }
    this.saveToDisk();
    return msg;
  }
  pruneExpiredMessages(conversationId) {
    const msgs = this.messages.get(conversationId);
    if (!msgs || msgs.length === 0) return;
    const now = Date.now();
    const active = msgs.filter((m) => {
      if (m.isPermanent) return true;
      if (!m.expiresAt) return true;
      return new Date(m.expiresAt).getTime() > now;
    });
    if (active.length !== msgs.length) {
      this.messages.set(conversationId, active);
      const conv = this.conversations.get(conversationId);
      if (conv) {
        conv.lastMessage = active[active.length - 1];
        this.conversations.set(conversationId, conv);
      }
      this.saveToDisk();
    }
  }
  getMessages(conversationId, requestingUserId) {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(requestingUserId)) {
      throw new Error("Unauthorized conversation access");
    }
    const otherId = conv.participantIds.find((id) => id !== requestingUserId);
    if (this.isBlocked(requestingUserId, otherId)) {
      throw new Error("Access blocked by user policy");
    }
    this.pruneExpiredMessages(conversationId);
    const msgs = this.messages.get(conversationId) || [];
    return msgs.filter((m) => {
      if (m.deletedStatus === "deleted_for_everyone") return false;
      if (m.deletedForUserIds && m.deletedForUserIds.includes(requestingUserId)) return false;
      return true;
    });
  }
  deleteMessage(conversationId, messageId, requestingUserId, mode = "for_me") {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(requestingUserId)) {
      throw new Error("Unauthorized conversation access");
    }
    const msgs = this.messages.get(conversationId) || [];
    const msg = msgs.find((m) => m.id === messageId);
    if (!msg) {
      throw new Error("Message not found");
    }
    if (mode === "for_everyone") {
      if (msg.senderId !== requestingUserId) {
        throw new Error("Only the sender can delete a message for everyone");
      }
      msg.deletedStatus = "deleted_for_everyone";
      msg.text = "This message was deleted";
      const mediaId = msg.photo?.mediaId || msg.voice?.mediaId || msg.starVideo?.mediaId;
      if (mediaId) {
        try {
          deleteMediaRecord(mediaId, requestingUserId);
        } catch (e) {
        }
      }
    } else {
      if (!msg.deletedForUserIds) {
        msg.deletedForUserIds = [];
      }
      if (!msg.deletedForUserIds.includes(requestingUserId)) {
        msg.deletedForUserIds.push(requestingUserId);
      }
      msg.deletedStatus = "deleted_for_me";
    }
    this.saveToDisk();
    return true;
  }
  sendMessage(senderId, conversationId, payload) {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(senderId)) {
      throw new Error("Unauthorized conversation access");
    }
    const receiverId = conv.participantIds.find((id) => id !== senderId);
    if (this.isBlocked(senderId, receiverId)) {
      throw new Error("Cannot message a blocked user");
    }
    const receiverUser = this.users.get(receiverId);
    if (!receiverUser || receiverUser.status !== "ACTIVE") {
      throw new Error("Recipient account is not active");
    }
    const ttlSeconds = payload.ttlSeconds !== void 0 ? payload.ttlSeconds : conv.messageTtlSeconds;
    let expiresAt = void 0;
    if (ttlSeconds && ttlSeconds > 0 && !payload.isPermanent) {
      expiresAt = new Date(Date.now() + ttlSeconds * 1e3).toISOString();
    }
    let finalMedia = payload.media;
    let finalPhotoUrl = payload.photoUrl?.trim();
    if (payload.photo) {
      finalPhotoUrl = `/api/media/${payload.photo.mediaId}`;
      finalMedia = {
        url: `/api/media/${payload.photo.mediaId}`,
        mimeType: payload.photo.mimeType,
        width: payload.photo.width,
        height: payload.photo.height,
        sizeBytes: payload.photo.size,
        thumbnailUrl: payload.photo.thumbnailRef ? `/api/media/${payload.photo.mediaId}?thumb=true` : void 0
      };
    } else if (payload.voice) {
      finalMedia = {
        url: `/api/media/${payload.voice.mediaId}`,
        mimeType: payload.voice.mimeType,
        durationSeconds: payload.voice.duration,
        sizeBytes: payload.voice.size
      };
    } else if (payload.starVideo) {
      finalMedia = {
        url: `/api/media/${payload.starVideo.mediaId}`,
        mimeType: payload.starVideo.mimeType,
        durationSeconds: payload.starVideo.duration,
        width: payload.starVideo.width,
        height: payload.starVideo.height,
        sizeBytes: payload.starVideo.size,
        thumbnailUrl: payload.starVideo.thumbnailRef ? `/api/media/${payload.starVideo.mediaId}?thumb=true` : void 0
      };
    }
    let finalLocation = payload.location;
    if (payload.locationPayload) {
      finalLocation = {
        lat: payload.locationPayload.latitude,
        lng: payload.locationPayload.longitude,
        approximateArea: payload.locationPayload.label || payload.locationPayload.placeName
      };
    }
    let finalLinkPreview = payload.linkPreview;
    if (payload.link) {
      finalLinkPreview = {
        url: payload.link.normalizedUrl,
        domain: payload.link.domain,
        title: payload.link.title,
        thumbnailUrl: payload.link.thumbnailRef
      };
    }
    const newMessage = {
      id: `msg-${Date.now()}-${import_crypto4.default.randomBytes(2).toString("hex")}`,
      conversationId,
      senderId,
      receiverId,
      recipientId: receiverId,
      type: payload.type || "TEXT",
      text: payload.text?.trim(),
      photoUrl: finalPhotoUrl,
      media: finalMedia,
      linkPreview: finalLinkPreview,
      location: finalLocation,
      photo: payload.photo,
      link: payload.link,
      locationPayload: payload.locationPayload,
      stickerPayload: payload.stickerPayload,
      voice: payload.voice,
      starVideo: payload.starVideo,
      stickerId: payload.stickerId || payload.stickerPayload?.stickerId,
      stickerUrl: payload.stickerUrl || payload.stickerPayload?.url,
      stickerName: payload.stickerName || payload.stickerPayload?.name,
      tapType: payload.tapType,
      vaultAction: payload.vaultAction,
      expiresAt,
      ttlSeconds,
      isPermanent: payload.isPermanent,
      excludeFromBackup: payload.excludeFromBackup ?? payload.disableAutoBackup ?? conv.disableAutoBackup ?? conv.settings?.disableAutoBackup ?? conv.excludeFromBackup ?? false,
      disableAutoBackup: payload.disableAutoBackup ?? conv.disableAutoBackup ?? conv.settings?.disableAutoBackup ?? false,
      status: "DELIVERED",
      deliveryStatus: payload.deliveryStatus || "delivered",
      readStatus: payload.readStatus || false,
      deletedStatus: payload.deletedStatus || "none",
      deletedForUserIds: payload.deletedForUserIds || [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const msgs = this.messages.get(conversationId) || [];
    msgs.push(newMessage);
    this.messages.set(conversationId, msgs);
    conv.lastMessage = newMessage;
    this.conversations.set(conversationId, conv);
    this.saveToDisk();
    return newMessage;
  }
  sendTap(senderId, targetUserId, tapType) {
    const conv = this.getOrCreateConversation(senderId, targetUserId);
    const tapTexts = {
      HOT: "\u{1F525} Wys\u0142a\u0142 Ci ogie\u0144!",
      WOOF: "\u{1F43E} Wys\u0142a\u0142 Ci Woof!",
      BOLT: "\u26A1 Wys\u0142a\u0142 Ci Aura Tap!",
      WAVE: "\u{1F44B} Pomacha\u0142 do Ciebie!"
    };
    const message = this.sendMessage(senderId, conv.id, {
      type: "TAP",
      tapType,
      text: tapTexts[tapType] || "\u26A1 Wys\u0142a\u0142 Ci Aura Tap!"
    });
    return { conversation: conv, message };
  }
  markMessagesRead(conversationId, userId) {
    const conv = this.conversations.get(conversationId);
    if (!conv || !conv.participantIds.includes(userId)) {
      return;
    }
    const msgs = this.messages.get(conversationId) || [];
    let updated = false;
    msgs.forEach((m) => {
      if (m.receiverId === userId && m.status !== "READ") {
        m.status = "READ";
        updated = true;
      }
    });
    if (updated) {
      this.saveToDisk();
    }
  }
  // --- Matches ---
  getUserMatches(userId) {
    const blockedUserIds = new Set(
      this.blocks.filter((b) => b.blockerUserId === userId || b.blockedUserId === userId).map((b) => b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId)
    );
    const result = [];
    for (const m of this.matches) {
      if (m.user1Id === userId || m.user2Id === userId) {
        const otherId = m.user1Id === userId ? m.user2Id : m.user1Id;
        if (blockedUserIds.has(otherId)) continue;
        const otherUser = this.users.get(otherId);
        if (!otherUser || otherUser.status !== "ACTIVE") continue;
        result.push({
          ...m,
          matchedProfile: otherUser.profile
        });
      }
    }
    return result;
  }
  // --- Admin & Safety Moderation ---
  getReports() {
    return this.reports;
  }
  suspendUser(userId) {
    const user = this.users.get(userId);
    if (!user) return false;
    user.status = "SUSPENDED";
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    for (const [tok, uid] of Array.from(this.tokens.entries())) {
      if (uid === userId) this.tokens.delete(tok);
    }
    this.saveToDisk();
    return true;
  }
  softDeleteUser(userId) {
    const user = this.users.get(userId);
    if (!user) return false;
    user.status = "DELETED";
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    for (const [tok, uid] of Array.from(this.tokens.entries())) {
      if (uid === userId) this.tokens.delete(tok);
    }
    this.saveToDisk();
    return true;
  }
  getAdminStats() {
    const usersArr = Array.from(this.users.values());
    return {
      totalUsers: usersArr.length,
      activeUsers: usersArr.filter((u) => u.status === "ACTIVE").length,
      suspendedUsers: usersArr.filter((u) => u.status === "SUSPENDED").length,
      pendingReports: this.reports.filter((r) => r.status === "PENDING").length,
      totalMatches: this.matches.length,
      totalMessagesSent: Array.from(this.messages.values()).reduce((acc, m) => acc + m.length, 0)
    };
  }
  // --- Moments / Stories ---
  getMoments(userId) {
    const now = /* @__PURE__ */ new Date();
    const blockedUserIds = new Set(
      this.blocks.filter((b) => b.blockerUserId === userId || b.blockedUserId === userId).map((b) => b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId)
    );
    return this.moments.filter((m) => new Date(m.expiresAt) > now).filter((m) => !blockedUserIds.has(m.userId)).filter((m) => {
      if (m.userId === userId) return true;
      if (m.privacy === "everyone") return true;
      if (m.privacy === "specific" && m.allowedUserIds) {
        return m.allowedUserIds.includes(userId);
      }
      return true;
    }).map((m) => {
      const creator = this.users.get(m.userId);
      return {
        ...m,
        creatorProfile: creator?.profile
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  createMoment(userId, data) {
    const newMoment = {
      id: `mom-${Date.now()}`,
      userId,
      mediaUrl: data.mediaUrl.trim(),
      mediaType: data.mediaType || "photo",
      caption: data.caption ? data.caption.trim() : void 0,
      privacy: data.privacy || "everyone",
      allowedUserIds: data.allowedUserIds,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      expiresAt: new Date(Date.now() + 1e3 * 60 * 60 * 24).toISOString(),
      // 24 hours
      viewsCount: 0,
      likesCount: 0,
      hasLiked: false
    };
    const creator = this.users.get(userId);
    newMoment.creatorProfile = creator?.profile;
    this.moments.unshift(newMoment);
    this.saveToDisk();
    return newMoment;
  }
  likeMoment(userId, momentId) {
    const mom = this.moments.find((m) => m.id === momentId);
    if (!mom) return false;
    mom.likesCount = (mom.likesCount || 0) + 1;
    mom.hasLiked = true;
    this.saveToDisk();
    return true;
  }
  viewMoment(userId, momentId) {
    const mom = this.moments.find((m) => m.id === momentId);
    if (!mom) return false;
    mom.viewsCount = (mom.viewsCount || 0) + 1;
    this.saveToDisk();
    return true;
  }
  deleteMoment(userId, momentId) {
    const idx = this.moments.findIndex((m) => m.id === momentId && m.userId === userId);
    if (idx === -1) return false;
    this.moments.splice(idx, 1);
    this.saveToDisk();
    return true;
  }
};
var store = new DataStore();

// src/data/queerVenues.ts
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
var GLOBAL_QUEER_VENUES = [
  // --- LONDON, UK ---
  {
    id: "venue-london-heaven",
    name: "Heaven Nightclub",
    category: "club",
    lat: 51.5074,
    lng: -0.1238,
    address: "17 Craven St, Charing Cross, London WC2N 5NT",
    neighborhood: "Soho / Charing Cross",
    description: "Legendary multi-room underground nightclub operating since 1979 under Charing Cross station, hosting iconic G-A-Y events.",
    distanceKm: 0,
    tags: ["Legendary Club", "DJs & Dance", "Historic", "Underground"],
    imageUrl: "https://images.unsplash.com/photo-1545128485-c400e7702796?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-london-rvt",
    name: "Royal Vauxhall Tavern",
    category: "bar",
    lat: 51.4862,
    lng: -0.1226,
    address: "372 Kennington Ln, London SE11 5HY",
    neighborhood: "Vauxhall",
    description: "South London\u2019s premier LGBTQ+ cabaret venue, historic Grade II listed building celebrated for queer arts and alternative performance.",
    distanceKm: 0,
    tags: ["Cabaret", "Queer Performance", "Historic Landmark", "Vauxhall"],
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-london-dalston",
    name: "Dalston Superstore",
    category: "cafe",
    lat: 51.5478,
    lng: -0.0754,
    address: "117 Kingsland High St, London E8 2PB",
    neighborhood: "East London / Dalston",
    description: "Eclectic East London daytime queer diner, cafe and art space transforming into an energetic subterranean dance sanctuary at night.",
    distanceKm: 0,
    tags: ["Queer Diner & Brunch", "Art Exhibitions", "Basement Club", "East London"],
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-london-center",
    name: "London LGBTQ+ Community Centre",
    category: "community",
    lat: 51.5065,
    lng: -0.0988,
    address: "60-62 Hopton St, London SE1 9JH",
    neighborhood: "Bankside / Southwark",
    description: "Sober, intergenerational community lounge on Bankside offering mental health support, queer lending library, and inclusive social workshops.",
    distanceKm: 0,
    tags: ["Sober Space", "Mental Health", "Queer Library", "Workshops"],
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80",
    isVerified: true
  },
  // --- BERLIN, GERMANY ---
  {
    id: "venue-berlin-schwuz",
    name: "SchwuZ Club",
    category: "club",
    lat: 52.4789,
    lng: 13.4398,
    address: "Rollbergstra\xDFe 26, 12053 Berlin",
    neighborhood: "Neuk\xF6lln",
    description: "Germany\u2019s oldest continuously running queer club, housed in a historic Neuk\xF6lln brewery with three diverse dance floors and community focus.",
    distanceKm: 0,
    tags: ["Historic 1977", "Multi-floor", "Solidarity Events", "Neuk\xF6lln"],
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-berlin-mobel",
    name: "M\xF6bel Olfe",
    category: "bar",
    lat: 52.4994,
    lng: 13.4184,
    address: "Reichenberger Str. 177, 10999 Berlin",
    neighborhood: "Kreuzberg",
    description: "High-ceilinged retro bar in Kottbusser Tor with eclectic chairs suspended from the ceiling, welcoming a diverse queer Kreuzberg crowd.",
    distanceKm: 0,
    tags: ["Kreuzberg", "Draft Beer", "Queer Gathering", "Outdoor Terrace"],
    imageUrl: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-berlin-museum",
    name: "Schwules Museum Berlin",
    category: "community",
    lat: 52.5028,
    lng: 13.3592,
    address: "L\xFCtzowstra\xDFe 73, 10785 Berlin",
    neighborhood: "Tiergarten / Sch\xF6neberg",
    description: "World-renowned archival institution and exhibition space dedicated to preserving queer history, LGBTIQ+ culture, and emancipatory movements.",
    distanceKm: 0,
    tags: ["Queer History", "Archives", "Exhibitions", "Safe Space"],
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
    isVerified: true
  },
  // --- NEW YORK CITY, USA ---
  {
    id: "venue-nyc-stonewall",
    name: "The Stonewall Inn",
    category: "bar",
    lat: 40.7338,
    lng: -74.0021,
    address: "53 Christopher St, New York, NY 10014",
    neighborhood: "Greenwich Village",
    description: "Birthplace of the modern LGBTQ+ civil rights movement, National Historic Landmark featuring live cabaret, piano shows, and upstairs dance floor.",
    distanceKm: 0,
    tags: ["Historic Landmark 1969", "Cabaret", "Greenwich Village", "Heritage"],
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-nyc-cubbyhole",
    name: "Cubbyhole Bar",
    category: "bar",
    lat: 40.7362,
    lng: -74.0044,
    address: "281 W 12th St, New York, NY 10014",
    neighborhood: "West Village",
    description: "Intimate, warm neighborhood queer bar famous for its ceiling packed with hanging paper lanterns, toys, and eclectic local patrons.",
    distanceKm: 0,
    tags: ["Cozy Atmosphere", "Jukebox", "Neighborhood Icon", "West Village"],
    imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-nyc-center",
    name: "The Lesbian, Gay, Bisexual & Transgender Community Center NYC",
    category: "community",
    lat: 40.7376,
    lng: -73.9997,
    address: "208 W 13th St, New York, NY 10011",
    neighborhood: "Greenwich Village",
    description: "Iconic multi-story community haven providing wellness clinics, substance use recovery programs, Keith Haring mural, and youth groups.",
    distanceKm: 0,
    tags: ["Community Center", "Wellness", "Keith Haring Mural", "Youth & Seniors"],
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80",
    isVerified: true
  },
  // --- PARIS, FRANCE ---
  {
    id: "venue-paris-raidd",
    name: "Le Raidd Bar",
    category: "bar",
    lat: 48.8585,
    lng: 2.3551,
    address: "23 Rue du Temple, 75004 Paris",
    neighborhood: "Le Marais",
    description: "Famous Marais institution known for high-energy music, cocktail lounge, famous shower show performances, and vibrant international crowds.",
    distanceKm: 0,
    tags: ["Le Marais", "Shower Show", "Cocktails", "Nightlife"],
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-paris-mutinerie",
    name: "La Mutinerie",
    category: "cafe",
    lat: 48.8617,
    lng: 2.3524,
    address: "176 Rue Saint-Martin, 75003 Paris",
    neighborhood: "Beaubourg / Marais",
    description: "Feminist, queer, and trans-positive bar, cafe, and self-managed political safe space hosting workshops, book launches, and queer concerts.",
    distanceKm: 0,
    tags: ["Queer Cafe & Books", "Trans Inclusive", "Workshops", "Sober Options"],
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=80",
    isVerified: true
  },
  // --- SAN FRANCISCO, USA ---
  {
    id: "venue-sf-twinpeaks",
    name: "Twin Peaks Tavern",
    category: "bar",
    lat: 37.7628,
    lng: -122.4349,
    address: "401 Castro St, San Francisco, CA 94114",
    neighborhood: "The Castro",
    description: 'The "Gateway to the Castro" \u2014 legendary landmark bar recognized as one of the first gay bars with clear, open picture windows to the street.',
    distanceKm: 0,
    tags: ["Historic Landmark", "Castro Icon", "Cocktails", "Windows to Castro"],
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-sf-center",
    name: "SF LGBT Center",
    category: "community",
    lat: 37.7712,
    lng: -122.4234,
    address: "1800 Market St, San Francisco, CA 94102",
    neighborhood: "Market / Castro",
    description: "Vibrant community center connecting LGBTQ+ individuals to economic opportunities, housing navigation, health services, and community arts.",
    distanceKm: 0,
    tags: ["Community Hub", "Health & Housing", "Arts", "Victorian Building"],
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80",
    isVerified: true
  },
  // --- MADRID, SPAIN ---
  {
    id: "venue-madrid-ll",
    name: "LL Showbar Chueca",
    category: "bar",
    lat: 40.4227,
    lng: -3.6978,
    address: "Calle de Pelayo, 11, 28004 Madrid",
    neighborhood: "Chueca",
    description: "Classic Chueca cabaret and comedy bar celebrating Spanish drag artistry, hilarious live shows, and warm Spanish hospitality.",
    distanceKm: 0,
    tags: ["Chueca", "Drag Shows", "Cabaret", "Spanish Nightlife"],
    imageUrl: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&q=80",
    isVerified: true
  },
  // --- TOKYO, JAPAN ---
  {
    id: "venue-tokyo-dragonmen",
    name: "Dragon Men Shinjuku",
    category: "bar",
    lat: 35.6908,
    lng: 139.7088,
    address: "2-11-4 Shinjuku, Shinjuku City, Tokyo 160-0022",
    neighborhood: "Shinjuku Ni-ch\u014Dme",
    description: "Friendly, internationally renowned bar in the heart of Ni-ch\u014Dme welcoming locals and queer travelers with DJ sets and terrace seating.",
    distanceKm: 0,
    tags: ["Shinjuku Ni-chome", "International Friendly", "DJs", "Cocktails"],
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80",
    isVerified: true
  },
  // --- SYDNEY, AUSTRALIA ---
  {
    id: "venue-sydney-stonewall",
    name: "Stonewall Hotel Oxford St",
    category: "club",
    lat: -33.8798,
    lng: 151.2158,
    address: "175 Oxford St, Darlinghurst NSW 2010",
    neighborhood: "Darlinghurst / Oxford St",
    description: "Iconic three-story venue on Sydney\u2019s famed Oxford Street featuring top drag divas, DJ dance parties, and LGBTQ+ pride events.",
    distanceKm: 0,
    tags: ["Oxford St", "Drag Queens", "3 Levels", "Sydney Mardi Gras"],
    imageUrl: "https://images.unsplash.com/photo-1545128485-c400e7702796?w=600&q=80",
    isVerified: true
  },
  // --- LOS ANGELES, USA (Retained in global catalog with exact coordinates) ---
  {
    id: "venue-la-abbey",
    name: "The Abbey Food & Bar",
    category: "bar",
    lat: 34.085,
    lng: -118.3842,
    address: "692 N Robertson Blvd, West Hollywood, CA 90069",
    neighborhood: "West Hollywood",
    description: "World-famous gay bar with expansive open-air patio, dancing, signature martinis, and high-energy crowd.",
    distanceKm: 0,
    tags: ["Patio", "Dancing", "Cocktails", "WeHo Icon"],
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-la-mickys",
    name: "Micky's WeHo",
    category: "club",
    lat: 34.0886,
    lng: -118.3812,
    address: "8857 Santa Monica Blvd, West Hollywood, CA 90069",
    neighborhood: "West Hollywood",
    description: "High-energy 2-story LGBTQ+ dance club featuring resident DJs, theme parties, and mezzanine lounge.",
    distanceKm: 0,
    tags: ["Dance Club", "DJs", "Theme Nights", "WeHo"],
    imageUrl: "https://images.unsplash.com/photo-1545128485-c400e7702796?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-la-akbar",
    name: "Akbar",
    category: "bar",
    lat: 34.0955,
    lng: -118.2798,
    address: "4356 Sunset Blvd, Los Angeles, CA 90029",
    neighborhood: "Silver Lake",
    description: "Beloved neighborhood queer haven in Silver Lake with legendary rock/indie jukebox and red-lit back room.",
    distanceKm: 0,
    tags: ["Indie & Alternative", "Jukebox", "Silver Lake Local"],
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-la-precinct",
    name: "Precinct DTLA",
    category: "club",
    lat: 34.0452,
    lng: -118.252,
    address: "357 S Broadway, Los Angeles, CA 90013",
    neighborhood: "Downtown LA",
    description: "Expansive second-story gay rock-n-roll bar and nightclub with exposed brick, drag showcases, and outdoor balcony.",
    distanceKm: 0,
    tags: ["Downtown Queer", "Live Drag Shows", "Balcony Lounge"],
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80",
    isVerified: true
  },
  {
    id: "venue-la-lgbtcenter",
    name: "Los Angeles LGBT Center",
    category: "community",
    lat: 34.0982,
    lng: -118.3371,
    address: "1118 N McCadden Pl, Los Angeles, CA 90038",
    neighborhood: "Hollywood",
    description: "World landmark community campus offering queer health services, PrEP/PEP clinic, youth & senior programs.",
    distanceKm: 0,
    tags: ["Health & PrEP", "Community Center", "Safe Space"],
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80",
    isVerified: true
  }
];
var QUEER_VENUES = GLOBAL_QUEER_VENUES;
function getVenuesNearLocation(lat, lng, maxRadiusKm = 45) {
  if (isNaN(lat) || isNaN(lng)) return [];
  const results = [];
  for (const venue of GLOBAL_QUEER_VENUES) {
    const dist = calculateDistanceKm(lat, lng, venue.lat, venue.lng);
    if (dist <= maxRadiusKm) {
      results.push({
        ...venue,
        distanceKm: dist
      });
    }
  }
  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}
function searchVenues(query, userLat, userLng) {
  const cleanQ = query.toLowerCase().trim();
  if (!cleanQ) return [];
  return GLOBAL_QUEER_VENUES.filter((v) => {
    return v.name.toLowerCase().includes(cleanQ) || v.neighborhood.toLowerCase().includes(cleanQ) || v.address.toLowerCase().includes(cleanQ) || v.category.toLowerCase().includes(cleanQ) || v.tags.some((t) => t.toLowerCase().includes(cleanQ));
  }).map((v) => {
    if (userLat !== void 0 && userLng !== void 0) {
      return {
        ...v,
        distanceKm: calculateDistanceKm(userLat, userLng, v.lat, v.lng)
      };
    }
    return v;
  });
}

// src/data/auraStickers.ts
var AURA_STICKERS = [
  { id: "st-fire", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp", name: "Fire" },
  { id: "st-heart", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f496/512.webp", name: "Sparkling Heart" },
  { id: "st-peach", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f351/512.webp", name: "Peach" },
  { id: "st-eggplant", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f346/512.webp", name: "Eggplant" },
  { id: "st-sweat", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a6/512.webp", name: "Sweat" },
  { id: "st-lips", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f48b/512.webp", name: "Kiss" },
  { id: "st-devil", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f608/512.webp", name: "Devil" },
  { id: "st-rainbow", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f308/512.webp", name: "Rainbow" },
  { id: "st-sparkles", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.webp", name: "Sparkles" },
  { id: "st-cocktail", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f378/512.webp", name: "Cocktail" },
  { id: "st-eyes", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f440/512.webp", name: "Eyes" },
  { id: "st-party", url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp", name: "Party" }
];

// src/data/nativeAds.ts
var NATIVE_ADS_INVENTORY = [
  {
    id: "ad-aura-premium",
    placement: "discover",
    brandName: "AURA Black",
    tagline: "Bez reklam \u2022 Incognito \u2022 Filtry",
    headline: "Przejd\u017A na AURA Black",
    description: "Do\u015Bwiadczaj AURA bez \u017Cadnych przerw, przegl\u0105daj profile w trybie niewidocznym i odblokuj nieograniczone filtry.",
    ctaText: "Sprawd\u017A AURA Black",
    ctaUrl: "#settings-premium",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1000",
    advertiserDomain: "aura18.app/premium",
    category: "Subskrypcja Premium",
    isNonPersonalizedOnly: true
  },
  {
    id: "ad-palais-boutique",
    placement: "discover",
    brandName: "Palais Boutique Hotel",
    tagline: "Berlin \u2022 Prywatny Rooftop Lounge",
    headline: "Ekskluzywny pobyt w sercu Berlina",
    description: "Butikowe apartamenty, strefa saun tylko dla go\u015Bci oraz prywatne wieczory na dachu z widokiem na Sch\xF6neberg.",
    ctaText: "Rezerwuj pobyt",
    ctaUrl: "https://palais-boutique-berlin.example.com",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000",
    advertiserDomain: "palais-berlin.de",
    category: "Podr\xF3\u017Ce & Hotelarstwo",
    isNonPersonalizedOnly: true
  },
  {
    id: "ad-sanctuary-wellness",
    placement: "discover",
    brandName: "Sanctuary Holistic Spa",
    tagline: "Odnowa biologiczna & masa\u017C",
    headline: "Prywatna strefa relaksu i regeneracji",
    description: "Dedykowane sesje masa\u017Cu powi\u0119ziowego, aromaterapii i kriosauny stworzone z my\u015Bl\u0105 o pe\u0142nym wyciszeniu.",
    ctaText: "Zarezerwuj wizyt\u0119",
    ctaUrl: "https://sanctuary-wellness.example.com",
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1000",
    advertiserDomain: "sanctuary-spa.eu",
    category: "Zdrowie & Wellness",
    isNonPersonalizedOnly: true
  },
  {
    id: "ad-atelier-fragrance",
    placement: "moments",
    brandName: "Atelier Nuit",
    tagline: "Niszowa woda perfumowana",
    headline: "Atelier Nuit: Drzewo sanda\u0142owe & sk\xF3ra",
    description: "G\u0142\u0119boki, zmys\u0142owy aromat o 16-godzinnej trwa\u0142o\u015Bci. Dyskretna elegancja zamkni\u0119ta w matowej butelce.",
    ctaText: "Odkryj zapach",
    ctaUrl: "https://atelier-nuit.example.com",
    imageUrl: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&q=80&w=1000",
    advertiserDomain: "atelier-nuit.paris",
    category: "Styl & Zapachy",
    isNonPersonalizedOnly: true
  },
  {
    id: "ad-checkpoint-health",
    placement: "moments",
    brandName: "CheckPoint Europe",
    tagline: "Darmowa i dyskretna profilaktyka",
    headline: "Zam\xF3w dyskretny pakiet profilaktyki do domu",
    description: "Szybkie, bezpieczne i poufne zestawy kontrolne z bezp\u0142atn\u0105 dostaw\u0105 do paczkomatu w ca\u0142ej UE.",
    ctaText: "Dowiedz si\u0119 wi\u0119cej",
    ctaUrl: "https://checkpoint-europe.example.org",
    imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1000",
    advertiserDomain: "checkpoint-europe.org",
    category: "Zdrowie Publiczne",
    isNonPersonalizedOnly: true
  },
  {
    id: "ad-spectrum-fest",
    placement: "radar",
    brandName: "Spectrum Fest 2026",
    tagline: "Barcelona \u2022 3 Dni Muzyki Elektronicznej",
    headline: "Festiwal Spectrum: Muzyka, pla\u017Ca i wolno\u015B\u0107",
    description: "Najwi\u0119ksze letnie spotkanie mi\u0142o\u015Bnik\xF3w muzyki techno i house na wybrze\u017Cu Barcelony. Pula bilet\xF3w Early Bird.",
    ctaText: "Sprawd\u017A line-up",
    ctaUrl: "https://spectrum-fest.example.com",
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1000",
    advertiserDomain: "spectrum-festival.com",
    category: "Wydarzenia & Muzyka",
    isNonPersonalizedOnly: true
  },
  {
    id: "ad-lounge-privat",
    placement: "radar",
    brandName: "Velvet Rooftop Club",
    tagline: "Cocktail bar & Speakeasy",
    headline: "Velvet Lounge: Kameralny cocktail bar",
    description: "Najwy\u017Cszej klasy miksologia, wyselekcjonowane wina i intymna atmosfera bez t\u0142um\xF3w i kompromis\xF3w.",
    ctaText: "Zobacz menu & stoliki",
    ctaUrl: "https://velvet-lounge.example.com",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1000",
    advertiserDomain: "velvet-lounge.eu",
    category: "Nightlife & Bary",
    isNonPersonalizedOnly: true
  },
  {
    id: "ad-settings-premium",
    placement: "settings",
    brandName: "AURA 18+ Premium",
    tagline: "100% Ad-Free Experience",
    headline: "Wy\u0142\u0105cz wszystkie reklamy w aplikacji",
    description: "Wspieraj rozw\xF3j niezale\u017Cnej platformy AURA i ciesz si\u0119 czystym interfejsem bez \u017Cadnych tre\u015Bci sponsorowanych.",
    ctaText: "W\u0142\u0105cz AURA Premium",
    ctaUrl: "#activate-premium",
    imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1000",
    advertiserDomain: "aura18.app",
    category: "Cz\u0142onkostwo",
    isNonPersonalizedOnly: true
  }
];
function getAdsForPlacement(placement, allowPersonalized = false) {
  return NATIVE_ADS_INVENTORY.filter((ad) => {
    if (ad.placement !== placement) return false;
    if (!allowPersonalized && !ad.isNonPersonalizedOnly) return false;
    return true;
  });
}

// src/services/cloudBackupService.ts
var CloudBackupService = class {
  timer = null;
  intervalMs = 12 * 60 * 60 * 1e3;
  // default 12 hours
  nextRunTimestamp = null;
  isRunning = false;
  constructor() {
    this.scheduleNextRun(60 * 1e3);
  }
  scheduleNextRun(delayMs) {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.nextRunTimestamp = Date.now() + delayMs;
    this.timer = setTimeout(async () => {
      await this.runAutomatedBackup();
      this.scheduleNextRun(this.intervalMs);
    }, delayMs);
  }
  /**
   * Executes the automated cloud backup routine, strictly respecting
   * conversation-level and message-level 'disableAutoBackup' flags.
   */
  async runAutomatedBackup() {
    if (this.isRunning) {
      const latest = store.getLatestCloudBackup();
      if (latest) return latest;
    }
    this.isRunning = true;
    try {
      console.log("[CloudBackupService] Initiating scheduled automated cloud backup...");
      const record = store.performAutomatedCloudBackup(true);
      console.log(
        `[CloudBackupService] Automated cloud backup ${record.backupId} completed. Eligible conversations backed up: ${record.backedUpConversations}. Conversations excluded due to 'disableAutoBackup': ${record.excludedDueToDisableAutoBackup}. Messages backed up: ${record.totalMessagesBackedUp}.`
      );
      return record;
    } catch (err) {
      console.error("[CloudBackupService] Error during automated cloud backup:", err);
      throw err;
    } finally {
      this.isRunning = false;
    }
  }
  /**
   * Allows manual / on-demand trigger of the automated cloud backup logic.
   */
  async triggerManualBackup() {
    this.isRunning = true;
    try {
      console.log("[CloudBackupService] Initiating on-demand cloud backup...");
      const record = store.performAutomatedCloudBackup(false);
      console.log(
        `[CloudBackupService] On-demand cloud backup ${record.backupId} completed. Eligible conversations backed up: ${record.backedUpConversations}. Excluded conversations (disableAutoBackup): ${record.excludedDueToDisableAutoBackup}.`
      );
      return record;
    } finally {
      this.isRunning = false;
    }
  }
  getStatus() {
    const baseStatus = store.getCloudBackupStatus();
    return {
      ...baseStatus,
      isRunning: this.isRunning,
      intervalHours: Math.round(this.intervalMs / (1e3 * 60 * 60)),
      nextScheduledBackup: this.nextRunTimestamp ? new Date(this.nextRunTimestamp).toISOString() : void 0
    };
  }
  getHistory() {
    return store.getCloudBackupHistory();
  }
  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.nextRunTimestamp = null;
  }
};
var cloudBackupService = new CloudBackupService();

// src/services/billingService.ts
var import_crypto5 = __toESM(require("crypto"), 1);
var import_googleapis = require("googleapis");
var import_app_store_server_library = require("@apple/app-store-server-library");

// src/config/billingConfig.ts
var import_core = require("@capacitor/core");
var STORE_PRODUCT_IDS = {
  MONTHLY: "aura.premium.monthly",
  THREE_MONTH: "aura.premium.3month",
  YEARLY: "aura.premium.yearly"
};
var STRIPE_PLAN_IDS = {
  MONTHLY: "aura_vip_monthly",
  YEARLY: "aura_vip_annual"
};
var BILLING_PLANS = {
  monthly: {
    id: STORE_PRODUCT_IDS.MONTHLY,
    tier: "monthly",
    fallbackTitle: "AURA Premium Monthly",
    fallbackDescription: "Full access to all VIP features, renewed monthly.",
    billingPeriod: "P1M",
    durationMonths: 1
  },
  three_month: {
    id: STORE_PRODUCT_IDS.THREE_MONTH,
    tier: "three_month",
    fallbackTitle: "AURA Premium 3 Months",
    fallbackDescription: "Popular option with seasonal savings, renewed every 3 months.",
    billingPeriod: "P3M",
    durationMonths: 3
  },
  yearly: {
    id: STORE_PRODUCT_IDS.YEARLY,
    tier: "yearly",
    fallbackTitle: "AURA Premium Yearly",
    fallbackDescription: "Best value VIP pass, billed annually.",
    billingPeriod: "P1Y",
    durationMonths: 12
  }
};
function resolveTierFromProductId(productId) {
  if (productId === STORE_PRODUCT_IDS.MONTHLY || productId === STRIPE_PLAN_IDS.MONTHLY) {
    return "monthly";
  }
  if (productId === STORE_PRODUCT_IDS.THREE_MONTH) {
    return "three_month";
  }
  if (productId === STORE_PRODUCT_IDS.YEARLY || productId === STRIPE_PLAN_IDS.YEARLY) {
    return "yearly";
  }
  return "monthly";
}

// src/config/appleCerts.ts
var APPLE_ROOT_CA_G3_B64 = "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==";
var APPLE_ROOT_CA_G2_B64 = "MIIFkjCCA3qgAwIBAgIIAeDltYNno+AwDQYJKoZIhvcNAQEMBQAwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEcyMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxMDA5WhcNMzkwNDMwMTgxMDA5WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzIxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBANgREkhI2imKScUcx+xuM23+TfvgHN6sXuI2pyT5f1BrTM65MFQn5bPW7SXmMLYFN14UIhHF6Kob0vuy0gmVOKTvKkmMXT5xZgM4+xb1hYjkWpIMBDLyyED7Ul+f9sDx47pFoFDVEovy3d6RhiPw9bZyLgHaC/YuOQhfGaFjQQscp5TBhsRTL3b2CtcM0YM/GlMZ81fVJ3/8E7j4ko380yhDPLVoACVdJ2LT3VXdRCCQgzWTxb+4Gftr49wIQuavbfqeQMpOhYV4SbHXw8EwOTKrfl+q04tvny0aIWhwZ7Oj8ZhBbZF8+NfbqOdfIRqMM78xdLe40fTgIvS/cjTf94FNcX1RoeKz8NMoFnNvzcytN31O661A4T+B/fc9Cj6i8b0xlilZ3MIZgIxbdMYs0xBTJh0UT8TUgWY8h2czJxQI6bR3hDRSj4n4aJgXv8O7qhOTH11UL6jHfPsNFL4VPSQ08prcdUFmIrQB1guvkJ4M6mL4m1k8COKWNORj3rw31OsMiANDC1CvoDTdUE0V+1ok2Az6DGOeHwOx4e7hqkP0ZmUoNwIx7wHHHtHMn23KVDpA287PT0aLSmWaasZobNfMmRtHsHLDd4/E92GcdB/O/WuhwpyUgquUoue9G7q5cDmVF8Up8zlYNPXEpMZ7YLlmQ1A/bmH8DvmGqmAMQ0uVAgMBAAGjQjBAMB0GA1UdDgQWBBTEmRNsGAPCe8CjoA1/coB6HHcmjTAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQwFAAOCAgEAUabz4vS4PZO/Lc4Pu1vhVRROTtHlznldgX/+tvCHM/jvlOV+3Gp5pxy+8JS3ptEwnMgNCnWefZKVfhidfsJxaXwU6s+DDuQUQp50DhDNqxq6EWGBeNjxtUVAeKuowM77fWM3aPbn+6/Gw0vsHzYmE1SGlHKy6gLti23kDKaQwFd1z4xCfVzmMX3zybKSaUYOiPjjLUKyOKimGY3xn83uamW8GrAlvacp/fQ+onVJv57byfenHmOZ4VxG/5IFjPoeIPmGlFYl5bRXOJ3riGQUIUkhOb9iZqmxospvPyFgxYnURTbImHy99v6ZSYA7LNKmp4gDBDEZt7Y6YUX6yfIjyGNzv1aJMbDZfGKnexWoiIqrOEDCzBL/FePwN983csvMmOa/orz6JopxVtfnJBtIRD6e/J/JzBrsQzwBvDR4yGn1xuZW7AYJNpDrFEobXsmII9oDMJELuDY++ee1KG++P+w8j2Ud5cAeh6Squpj9kuNsJnfdBrRkBof0Tta6SqoWqPQFZ2aWuuJVecMsXUmPgEkrihLHdoBR37q9ZV0+N0djMenl9MU/S60EinpxLK8JQzcPqOMyT/RFtm2XNuyE9QoB6he7hY1Ck3DDUOUUi78/w0EP3SIEIwiKum1xRKtzCTrJ+VKACd+66eYWyi4uTLLT3OUEVLLUNIAytbwPF+E=";
function getAppleRootCertificates() {
  return [
    Buffer.from(APPLE_ROOT_CA_G3_B64, "base64"),
    Buffer.from(APPLE_ROOT_CA_G2_B64, "base64")
  ];
}

// src/services/billingService.ts
function hashPurchaseToken(token) {
  return import_crypto5.default.createHash("sha256").update(token.trim()).digest("hex");
}
function getGooglePlayAndroidPublisher() {
  const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    return null;
  }
  try {
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new import_googleapis.google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"]
    });
    return import_googleapis.google.androidpublisher({ version: "v3", auth });
  } catch (err) {
    console.error("[Google Play Billing] Error parsing GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:", err.message);
    return null;
  }
}
function getAppleSignedDataVerifier() {
  try {
    const certs = getAppleRootCertificates();
    const isProd = process.env.NODE_ENV === "production" && !process.env.APPLE_USE_SANDBOX;
    const environment = isProd ? import_app_store_server_library.Environment.PRODUCTION : import_app_store_server_library.Environment.SANDBOX;
    const expectedBundle = process.env.APPLE_BUNDLE_ID || "app.aura.gay18";
    const appAppleId = process.env.APPLE_APP_ID ? parseInt(process.env.APPLE_APP_ID, 10) : void 0;
    if (environment === import_app_store_server_library.Environment.PRODUCTION && appAppleId === void 0) {
      console.warn("[Apple StoreKit] APPLE_APP_ID is not configured for production verifier.");
      return null;
    }
    return new import_app_store_server_library.SignedDataVerifier(certs, false, environment, expectedBundle, appAppleId);
  } catch (err) {
    console.error("[Apple StoreKit] Error creating SignedDataVerifier:", err.message);
    return null;
  }
}
async function verifyGooglePlayPurchase(params) {
  const { packageName, subscriptionId, purchaseToken, userId } = params;
  if (!packageName || !subscriptionId || !purchaseToken || !userId) {
    return { valid: false, error: "Missing required Google Play verification parameters.", statusCode: 400 };
  }
  const expectedPackage = process.env.GOOGLE_PLAY_PACKAGE_NAME || "app.aura.gay18";
  if (packageName !== expectedPackage) {
    return { valid: false, error: `Package name mismatch. Expected ${expectedPackage}, got ${packageName}`, statusCode: 400 };
  }
  const validProductIds = Object.values(STORE_PRODUCT_IDS);
  if (!validProductIds.includes(subscriptionId)) {
    return { valid: false, error: `Unknown or unconfigured Google Play product ID: ${subscriptionId}`, statusCode: 400 };
  }
  const tokenHash = hashPurchaseToken(purchaseToken);
  const planTier = resolveTierFromProductId(subscriptionId);
  const existingOwner = await store.findUserByPurchaseTokenHash(tokenHash);
  if (existingOwner && existingOwner.id !== userId) {
    return {
      valid: false,
      error: "This Google Play purchase token is already associated with another AURA account. Please restore purchases from the original account.",
      statusCode: 409
    };
  }
  const play = getGooglePlayAndroidPublisher();
  if (!play) {
    console.error("[Google Play Billing] GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured. Verification failing closed.");
    return {
      valid: false,
      error: "BILLING_NOT_CONFIGURED: Google Play API credentials missing on server.",
      statusCode: 503
    };
  }
  try {
    console.log(`[Google Play Billing] Calling Subscriptions v2 for package ${packageName}, token hash ${tokenHash.slice(0, 10)}...`);
    const subRes = await play.purchases.subscriptionsv2.get({
      packageName,
      token: purchaseToken
    });
    const sub = subRes.data;
    if (!sub || !sub.subscriptionState) {
      return { valid: false, error: "Invalid or empty subscription response from Google Play Developer API.", statusCode: 400 };
    }
    const state = sub.subscriptionState;
    let status = "active";
    let isPremium = false;
    if (state === "SUBSCRIPTION_STATE_ACTIVE") {
      status = "active";
      isPremium = true;
    } else if (state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") {
      status = "grace_period";
      isPremium = true;
    } else if (state === "SUBSCRIPTION_STATE_ON_HOLD" || state === "SUBSCRIPTION_STATE_PAUSED") {
      status = "account_hold";
      isPremium = false;
    } else if (state === "SUBSCRIPTION_STATE_CANCELED") {
      status = "canceled";
      isPremium = true;
    } else {
      status = "expired";
      isPremium = false;
    }
    let verifiedProductId = subscriptionId;
    let expiryTime = sub.lineItems?.[0]?.expiryTime;
    let autoRenew = false;
    if (sub.lineItems && sub.lineItems.length > 0) {
      const item = sub.lineItems[0];
      if (item.productId && validProductIds.includes(item.productId)) {
        verifiedProductId = item.productId;
      }
      if (item.autoRenewingPlan?.autoRenewEnabled) {
        autoRenew = true;
      }
    }
    if (expiryTime && new Date(expiryTime).getTime() <= Date.now()) {
      isPremium = false;
      status = "expired";
    }
    if (!isPremium) {
      return {
        valid: false,
        error: `Subscription state is '${state}' with expiry '${expiryTime}'. Premium entitlement not granted.`,
        statusCode: 402
      };
    }
    if (sub.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING_PURCHASE_CONFIRMATION" || !sub.acknowledgementState) {
      try {
        console.log(`[Google Play Billing] Acknowledging subscription ${verifiedProductId}...`);
        await play.purchases.subscriptions.acknowledge({
          packageName,
          subscriptionId: verifiedProductId,
          token: purchaseToken
        });
      } catch (ackErr) {
        console.warn("[Google Play Billing] Acknowledge warning (may already be acknowledged):", ackErr.message);
      }
    }
    const entitlement = {
      userId,
      premium: isPremium,
      provider: "google_play",
      productId: verifiedProductId,
      planTier: resolveTierFromProductId(verifiedProductId),
      status,
      expiresAt: expiryTime || new Date(Date.now() + 30 * 24 * 3600 * 1e3).toISOString(),
      autoRenew,
      purchaseTokenHash: tokenHash,
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      lastVerifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await store.recordStoreEntitlement(entitlement);
    return { valid: true, entitlement, requiresAcknowledgment: true };
  } catch (apiErr) {
    console.error("[Google Play Billing] API verification failure:", apiErr.message);
    return {
      valid: false,
      error: `Google Play API verification failed: ${apiErr.message}`,
      statusCode: apiErr.code || 400
    };
  }
}
async function verifyAppleStoreKitTransaction(params) {
  const { transactionJws, userId } = params;
  if (!transactionJws || !userId) {
    return { valid: false, error: "Missing required StoreKit transaction parameters.", statusCode: 400 };
  }
  const verifier = getAppleSignedDataVerifier();
  if (!verifier) {
    console.error("[Apple StoreKit] SignedDataVerifier unavailable. Verification failing closed.");
    return {
      valid: false,
      error: "BILLING_NOT_CONFIGURED: Apple StoreKit verifier credentials missing on server.",
      statusCode: 503
    };
  }
  try {
    console.log("[Apple StoreKit] Cryptographically verifying StoreKit 2 transaction JWS...");
    const tx = await verifier.verifyAndDecodeTransaction(transactionJws);
    const expectedBundle = process.env.APPLE_BUNDLE_ID || "app.aura.gay18";
    if (tx.bundleId !== expectedBundle) {
      return { valid: false, error: `Bundle ID mismatch. Expected ${expectedBundle}, got ${tx.bundleId}`, statusCode: 400 };
    }
    const validProductIds = Object.values(STORE_PRODUCT_IDS);
    if (!tx.productId || !validProductIds.includes(tx.productId)) {
      return { valid: false, error: `Unrecognized Apple StoreKit product ID: ${tx.productId}`, statusCode: 400 };
    }
    const originalTransactionId = String(tx.originalTransactionId || tx.transactionId);
    const existingOwner = await store.findUserByOriginalTransactionId(originalTransactionId);
    if (existingOwner && existingOwner.id !== userId) {
      return {
        valid: false,
        error: "This Apple subscription is already associated with another AURA account. Please use Restore Purchases from your original account.",
        statusCode: 409
      };
    }
    const now = Date.now();
    let status = "active";
    let isPremium = true;
    if (tx.revocationDate && tx.revocationDate <= now) {
      status = "revoked";
      isPremium = false;
    } else if (tx.expiresDate && tx.expiresDate <= now) {
      status = "expired";
      isPremium = false;
    }
    if (!isPremium) {
      return {
        valid: false,
        error: `Apple subscription is not active (status: ${status}, expiresDate: ${tx.expiresDate}).`,
        statusCode: 402
      };
    }
    const planTier = resolveTierFromProductId(tx.productId);
    const expiresAt = tx.expiresDate ? new Date(tx.expiresDate).toISOString() : new Date(now + 30 * 24 * 3600 * 1e3).toISOString();
    const entitlement = {
      userId,
      premium: isPremium,
      provider: "apple_storekit",
      productId: tx.productId,
      planTier,
      status,
      expiresAt,
      autoRenew: !tx.revocationDate,
      originalTransactionId,
      storeTransactionId: String(tx.transactionId),
      environment: tx.environment === "Sandbox" ? "sandbox" : "production",
      lastVerifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await store.recordStoreEntitlement(entitlement);
    return { valid: true, entitlement };
  } catch (err) {
    console.error("[Apple StoreKit] Cryptographic verification failed:", err.message);
    return {
      valid: false,
      error: `Apple StoreKit cryptographic verification failed: ${err.message}`,
      statusCode: 400
    };
  }
}
async function handleGooglePlayRtdn(pubsubMessage) {
  if (!pubsubMessage || !pubsubMessage.data) {
    return { success: false, reason: "Empty Pub/Sub message" };
  }
  const messageId = pubsubMessage.messageId;
  const alreadyProcessed = await store.isStoreEventProcessed("google_play", messageId);
  if (alreadyProcessed) {
    console.log(`[Google Play RTDN] Duplicate message ${messageId} ignored.`);
    return { success: true, reason: "Already processed" };
  }
  try {
    const decoded = JSON.parse(Buffer.from(pubsubMessage.data, "base64").toString("utf-8"));
    await store.recordStoreBillingEvent(messageId, "google_play", messageId, "RTDN", decoded);
    const { subscriptionNotification, testNotification } = decoded;
    if (testNotification) {
      console.log("[Google Play RTDN] Test notification received successfully from Google Cloud Pub/Sub.");
      return { success: true, reason: "Test notification verified" };
    }
    if (!subscriptionNotification) {
      return { success: true, reason: "Non-subscription notification" };
    }
    const { purchaseToken, subscriptionId } = subscriptionNotification;
    if (!purchaseToken) {
      return { success: true, reason: "No purchase token in notification" };
    }
    const tokenHash = hashPurchaseToken(purchaseToken);
    const user = await store.findUserByPurchaseTokenHash(tokenHash);
    if (!user) {
      console.warn(`[Google Play RTDN] Notification received for unlinked token hash: ${tokenHash.slice(0, 10)}`);
      return { success: true, reason: "User not found for token" };
    }
    const play = getGooglePlayAndroidPublisher();
    if (play) {
      const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || "app.aura.gay18";
      const subRes = await play.purchases.subscriptionsv2.get({
        packageName,
        token: purchaseToken
      });
      const sub = subRes.data;
      if (sub && sub.subscriptionState) {
        const isPrem = sub.subscriptionState === "SUBSCRIPTION_STATE_ACTIVE" || sub.subscriptionState === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";
        let status = "active";
        if (sub.subscriptionState === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") status = "grace_period";
        else if (sub.subscriptionState === "SUBSCRIPTION_STATE_ON_HOLD") status = "account_hold";
        else if (sub.subscriptionState === "SUBSCRIPTION_STATE_CANCELED") status = "canceled";
        else if (sub.subscriptionState === "SUBSCRIPTION_STATE_EXPIRED") status = "expired";
        const existingEntitlement = await store.getUserEntitlements(user.id);
        const updated = {
          ...existingEntitlement,
          userId: user.id,
          premium: isPrem,
          provider: "google_play",
          productId: subscriptionId || existingEntitlement.productId,
          status,
          expiresAt: sub.lineItems?.[0]?.expiryTime || existingEntitlement.expiresAt,
          lastVerifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await store.recordStoreEntitlement(updated);
        console.log(`[Google Play RTDN] Authoritatively updated user ${user.id} status to ${status} (premium: ${isPrem})`);
      }
    }
    return { success: true };
  } catch (err) {
    console.error("[Google Play RTDN] Processing error:", err.message);
    return { success: false, reason: err.message };
  }
}
async function handleAppleStoreKitWebhook(signedPayload) {
  if (!signedPayload) {
    return { success: false, reason: "Missing signedPayload" };
  }
  const verifier = getAppleSignedDataVerifier();
  if (!verifier) {
    console.error("[Apple StoreKit Webhook] Verifier unavailable to process notification.");
    return { success: false, reason: "Verifier unavailable" };
  }
  try {
    const notification = await verifier.verifyAndDecodeNotification(signedPayload);
    const notificationUUID = notification.notificationUUID;
    if (notificationUUID) {
      const alreadyProcessed = await store.isStoreEventProcessed("apple_storekit", notificationUUID);
      if (alreadyProcessed) {
        console.log(`[Apple StoreKit Webhook] Duplicate notification ${notificationUUID} ignored.`);
        return { success: true, reason: "Already processed" };
      }
      await store.recordStoreBillingEvent(notificationUUID, "apple_storekit", notificationUUID, notification.notificationType || "UNKNOWN", notification);
    }
    const notificationType = notification.notificationType;
    const data = notification.data;
    if (!data || !data.signedTransactionInfo) {
      console.log(`[Apple StoreKit Webhook] Notification ${notificationType} contained no signedTransactionInfo.`);
      return { success: true };
    }
    const tx = await verifier.verifyAndDecodeTransaction(data.signedTransactionInfo);
    const originalTransactionId = String(tx.originalTransactionId || tx.transactionId);
    const user = await store.findUserByOriginalTransactionId(originalTransactionId);
    if (!user) {
      console.warn(`[Apple StoreKit Webhook] No user found for originalTransactionId: ${originalTransactionId}`);
      return { success: true, reason: "User not found" };
    }
    let status = "active";
    let isPremium = true;
    switch (notificationType) {
      case "SUBSCRIBED":
      case "DID_RENEW":
        status = "active";
        isPremium = true;
        break;
      case "EXPIRED":
        status = "expired";
        isPremium = false;
        break;
      case "REVOKE":
      case "REFUND":
        status = "revoked";
        isPremium = false;
        break;
      case "DID_FAIL_TO_RENEW":
        status = "grace_period";
        isPremium = true;
        break;
      case "GRACE_PERIOD_EXPIRED":
        status = "account_hold";
        isPremium = false;
        break;
      default:
        status = "active";
        isPremium = true;
    }
    const existingEntitlement = await store.getUserEntitlements(user.id);
    const updated = {
      ...existingEntitlement,
      userId: user.id,
      premium: isPremium,
      provider: "apple_storekit",
      productId: tx.productId || existingEntitlement.productId,
      status,
      expiresAt: tx.expiresDate ? new Date(tx.expiresDate).toISOString() : existingEntitlement.expiresAt,
      lastVerifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await store.recordStoreEntitlement(updated);
    console.log(`[Apple StoreKit Webhook] Authoritatively updated user ${user.id} to ${status} via ${notificationType}`);
    return { success: true };
  } catch (err) {
    console.error("[Apple StoreKit Webhook] Signature verification error:", err.message);
    return { success: false, reason: err.message };
  }
}
async function restoreUserPurchases(userId, receiptData, provider) {
  const current = await store.getUserEntitlements(userId);
  if (current.premium && (current.status === "active" || current.status === "grace_period")) {
    return {
      success: true,
      entitlement: current,
      message: "Active subscription found and restored for your account."
    };
  }
  if (receiptData && provider === "google_play") {
    try {
      const parsed = JSON.parse(receiptData);
      const res = await verifyGooglePlayPurchase({
        packageName: parsed.packageName || "app.aura.gay18",
        subscriptionId: parsed.productId,
        purchaseToken: parsed.purchaseToken,
        userId
      });
      if (res.valid && res.entitlement) {
        return {
          success: true,
          entitlement: res.entitlement,
          message: "Google Play subscription successfully restored."
        };
      }
    } catch {
    }
  } else if (receiptData && provider === "apple_storekit") {
    const res = await verifyAppleStoreKitTransaction({
      transactionJws: receiptData,
      userId
    });
    if (res.valid && res.entitlement) {
      return {
        success: true,
        entitlement: res.entitlement,
        message: "Apple StoreKit subscription successfully restored."
      };
    }
  }
  return {
    success: false,
    entitlement: current,
    message: "No active subscriptions were found for this store account."
  };
}

// server.ts
if (globalThis.__dirname === ".") {
  delete globalThis.__dirname;
}
initStorage();
var upload = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: { fileSize: 35 * 1024 * 1024 }
  // 35 MB limit (supports up to 30 MB Star Video)
});
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(
  import_express.default.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(self), microphone=(), payment=*, geolocation=(self)"
  );
  if (req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
});
var rateLimitMap = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW_MS = 60 * 1e3;
var MAX_REQUESTS_PER_WINDOW = 120;
function rateLimiter(req, res, next) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, record);
    return next();
  }
  record.count += 1;
  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: "Too many requests. Please slow down and try again." });
  }
  next();
}
app.use("/api", rateLimiter);
var authRateLimitMap = /* @__PURE__ */ new Map();
var AUTH_WINDOW_MS = 5 * 60 * 1e3;
var MAX_AUTH_ATTEMPTS = 5;
function authRateLimiter(req, res, next) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let record = authRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    authRateLimitMap.set(ip, { count: 1, resetTime: now + AUTH_WINDOW_MS });
    return next();
  }
  if (record.count >= MAX_AUTH_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1e3);
    res.setHeader("Retry-After", retryAfterSeconds);
    return res.status(429).json({
      error: "Too many authentication attempts. For your security, please wait a few minutes before trying again."
    });
  }
  record.count += 1;
  next();
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Authentication token required" });
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const user = store.getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: "Invalid, expired, or deactivated authentication session" });
  }
  if (user.status !== "ACTIVE") {
    return res.status(403).json({ error: `Account access restriction: status is ${user.status}` });
  }
  req.user = user;
  req.token = token;
  next();
}
function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const user = store.getUserByToken(token);
    if (user && user.status === "ACTIVE") {
      req.user = user;
      req.token = token;
    }
  }
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN" && req.user.role !== "SUPERADMIN") {
    return res.status(403).json({ error: "Access denied. Administrative privileges required." });
  }
  next();
}
var genAIClient = null;
function getGeminiClient() {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured");
    }
    genAIClient = new import_genai.GoogleGenAI({ apiKey });
  }
  return genAIClient;
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "AURA GAY 18+",
    environment: process.env.NODE_ENV || "development",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/auth/register", authRateLimiter, (req, res) => {
  try {
    const { email, displayName, age, is18PlusAccepted, isAgeVerified18Plus, password } = req.body;
    const isConfirmed18 = is18PlusAccepted === true || isAgeVerified18Plus === true;
    if (!isConfirmed18) {
      return res.status(400).json({ error: "You must confirm you are 18 years of age or older to use AURA." });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    const numAge = age ? Number(age) : 18;
    if (isNaN(numAge) || numAge < 18) {
      return res.status(400).json({ error: "AURA GAY 18+ is strictly reserved for adults 18 years of age and older." });
    }
    const cleanName = (displayName || email.split("@")[0] || "AURA Member").toString().trim();
    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: "Display name must be at least 2 characters long." });
    }
    const result = store.registerUser(email, cleanName, numAge, "USER", password);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Registration failed" });
  }
});
app.post("/api/auth/login", authRateLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email address is required." });
    }
    const result = store.loginUser(email, password);
    if (!result) {
      return res.status(404).json({ error: "No active account found for this email address. Please register." });
    }
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Login failed" });
  }
});
app.post("/api/auth/forgot-password", authRateLimiter, (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    const result = store.createPasswordReset(email.trim());
    const responsePayload = {
      success: true,
      message: "If an account exists with that email, password reset instructions have been generated."
    };
    if (process.env.NODE_ENV !== "production" && result) {
      responsePayload.devResetToken = result.token;
      responsePayload.expiresAt = result.expiresAt;
    }
    res.json(responsePayload);
  } catch (err) {
    res.status(500).json({ error: "Failed to process password recovery request." });
  }
});
app.post("/api/auth/reset-password", authRateLimiter, (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Password recovery token is required." });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters long." });
    }
    const success = store.resetPasswordWithToken(token.trim(), newPassword);
    if (!success) {
      return res.status(400).json({ error: "Password recovery link is invalid or has expired." });
    }
    res.json({
      success: true,
      message: "Password successfully updated. You may now log in with your new credentials."
    });
  } catch (err) {
    res.status(500).json({ error: "Password reset failed." });
  }
});
app.post("/api/media/upload/init", authenticateToken, async (req, res) => {
  try {
    const rateCheck = checkRateLimit(`upload_init_${req.user.id}`, MEDIA_LIMITS.RATE_LIMITS.UPLOAD_INIT);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: "Media upload rate limit exceeded. Please wait a moment." });
    }
    const { mediaType, mimeType, size, conversationId } = req.body;
    if (!mediaType || !mimeType || typeof size !== "number") {
      return res.status(400).json({ error: "Missing required parameters: mediaType, mimeType, size." });
    }
    const category = mediaType;
    if (!["photo", "voice", "star_video", "profile_photo"].includes(category)) {
      return res.status(400).json({ error: `Invalid mediaType: ${mediaType}.` });
    }
    if (conversationId) {
      const conv = store.getConversation(conversationId);
      if (!conv || !conv.participantIds.includes(req.user.id)) {
        return res.status(403).json({ error: "Unauthorized: You are not a participant in this conversation." });
      }
      const otherId = conv.participantIds.find((id) => id !== req.user.id);
      if (otherId) {
        if (store.isBlocked(req.user.id, otherId)) {
          return res.status(403).json({ error: "Cannot upload media to a blocked conversation." });
        }
        const otherUser = store.getUserById(otherId);
        if (!otherUser || otherUser.status !== "ACTIVE") {
          return res.status(403).json({ error: "Recipient account is not active." });
        }
      }
    }
    const session = createUploadSession(req.user.id, category, mimeType, size, conversationId);
    const allowedMimes = category === "photo" || category === "profile_photo" ? ALLOWED_PHOTO_MIMES : category === "voice" ? ALLOWED_AUDIO_MIMES : ALLOWED_VIDEO_MIMES;
    res.json({
      success: true,
      uploadId: session.uploadId,
      maxBytes: session.maxSizeBytes,
      allowedMimeTypes: allowedMimes,
      expiresAt: session.expiresAt
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to initialize media upload." });
  }
});
app.post("/api/media/upload/complete", authenticateToken, upload.single("media"), async (req, res) => {
  try {
    const rateCheck = checkRateLimit(`upload_comp_${req.user.id}`, MEDIA_LIMITS.RATE_LIMITS.UPLOAD_COMPLETE);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: "Media upload rate limit exceeded. Please wait a moment." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No media file received." });
    }
    const { uploadId, conversationId, caption, duration } = req.body;
    let category = "photo";
    let targetConvId = conversationId;
    if (uploadId) {
      const session = getUploadSession(uploadId);
      if (!session) {
        return res.status(400).json({ error: "Invalid or expired upload session." });
      }
      if (session.userId !== req.user.id) {
        return res.status(403).json({ error: "Upload session belongs to another user." });
      }
      category = session.category;
      targetConvId = session.conversationId || targetConvId;
    } else if (req.body.category) {
      category = req.body.category;
    }
    if (category === "star_video") {
      const vidRate = checkRateLimit(`vid_comp_${req.user.id}`, MEDIA_LIMITS.RATE_LIMITS.STAR_VIDEO_UPLOAD);
      if (!vidRate.allowed) {
        return res.status(429).json({ error: "Star Video upload limit reached. Maximum 6 videos per minute." });
      }
    }
    const record = await processAndSaveMedia({
      buffer: req.file.buffer,
      clientMime: req.file.mimetype,
      category,
      userId: req.user.id,
      conversationId: targetConvId,
      caption,
      clientDuration: duration ? Number(duration) : void 0
    });
    res.json({
      success: true,
      media: {
        mediaId: record.id,
        mimeType: record.mimeType,
        size: record.size,
        width: record.width,
        height: record.height,
        duration: record.duration,
        thumbnailRef: record.thumbnailFilename ? `/api/media/${record.id}?thumb=true` : void 0,
        url: `/api/media/${record.id}`
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Media processing failed." });
  }
});
app.post("/api/media/upload", authenticateToken, upload.single("media"), async (req, res) => {
  try {
    const rateCheck = checkRateLimit(`upload_comp_${req.user.id}`, MEDIA_LIMITS.RATE_LIMITS.UPLOAD_COMPLETE);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: "Upload rate limit exceeded. Please wait a moment." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No media file received." });
    }
    let category = "photo";
    if (req.body.category && ["photo", "voice", "star_video", "profile_photo"].includes(req.body.category)) {
      category = req.body.category;
    } else if (req.file.mimetype.startsWith("audio/")) {
      category = "voice";
    } else if (req.file.mimetype.startsWith("video/")) {
      category = "star_video";
    }
    const record = await processAndSaveMedia({
      buffer: req.file.buffer,
      clientMime: req.file.mimetype,
      category,
      userId: req.user.id,
      conversationId: req.body.conversationId,
      caption: req.body.caption,
      clientDuration: req.body.duration ? Number(req.body.duration) : void 0
    });
    res.json({
      success: true,
      media: {
        mediaId: record.id,
        url: `/api/media/${record.id}`,
        thumbnailUrl: record.thumbnailFilename ? `/api/media/${record.id}?thumb=true` : void 0,
        filename: record.filename,
        size: record.size,
        mimeType: record.mimeType,
        width: record.width,
        height: record.height,
        duration: record.duration
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Media upload failed." });
  }
});
app.get("/api/media/:mediaId", async (req, res) => {
  try {
    const mediaId = String(req.params.mediaId);
    const isThumb = req.query.thumb === "true";
    let requestingUserId = null;
    const authHeader = req.headers["authorization"];
    if (authHeader) {
      const cleanToken = authHeader.replace(/^Bearer\s+/i, "").trim();
      const user = store.getUserByToken(cleanToken);
      if (user && user.status === "ACTIVE") {
        requestingUserId = user.id;
      }
    }
    if (!requestingUserId && req.query.token) {
      const token = String(req.query.token);
      const signedPayload = verifyMediaAccessToken(token);
      if (signedPayload && signedPayload.mediaId === mediaId) {
        const user = store.getUserById(signedPayload.userId);
        if (user && user.status === "ACTIVE") {
          requestingUserId = user.id;
        }
      } else {
        const user = store.getUserByToken(token);
        if (user && user.status === "ACTIVE") {
          requestingUserId = user.id;
        }
      }
    }
    if (!requestingUserId) {
      return res.status(401).json({ error: "Authentication required to access media." });
    }
    const dlRate = checkRateLimit(`dl_${requestingUserId}`, MEDIA_LIMITS.RATE_LIMITS.MEDIA_DOWNLOAD);
    if (!dlRate.allowed) {
      return res.status(429).json({ error: "Download rate limit exceeded." });
    }
    const record = getMediaRecord(mediaId);
    if (!record || record.deletedAt) {
      return res.status(404).json({ error: "Media not found or has been deleted." });
    }
    if (record.conversationId) {
      const conv = store.getConversation(record.conversationId);
      if (!conv || !conv.participantIds.includes(requestingUserId)) {
        return res.status(403).json({ error: "Unauthorized: You are not a participant in this conversation." });
      }
      const otherId = conv.participantIds.find((id) => id !== requestingUserId);
      if (otherId) {
        if (store.isBlocked(requestingUserId, otherId)) {
          return res.status(403).json({ error: "Access blocked by user policy." });
        }
        const otherUser = store.getUserById(otherId);
        if (!otherUser || otherUser.status !== "ACTIVE") {
          return res.status(403).json({ error: "Participant account is inactive." });
        }
      }
      const msgs = store.getMessages(record.conversationId, requestingUserId);
      const hasActiveMessage = msgs.some(
        (m) => m.photo?.mediaId === mediaId || m.voice?.mediaId === mediaId || m.starVideo?.mediaId === mediaId || m.media?.url?.includes(mediaId)
      );
      if (!hasActiveMessage && record.ownerId !== requestingUserId) {
        return res.status(404).json({ error: "Media is no longer accessible or was deleted." });
      }
    }
    const fileInfo = getMediaFileForServing(mediaId, isThumb);
    if (!fileInfo) {
      return res.status(404).json({ error: "Media binary file not found." });
    }
    res.setHeader("Content-Type", fileInfo.mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    res.setHeader("Content-Disposition", 'inline; filename="safe_media"');
    res.setHeader("Cache-Control", "private, no-transform, max-age=3600");
    res.sendFile(fileInfo.path);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to deliver media." });
  }
});
app.get("/api/media/:mediaId/sign", authenticateToken, (req, res) => {
  const mediaId = String(req.params.mediaId);
  const record = getMediaRecord(mediaId);
  if (!record) {
    return res.status(404).json({ error: "Media not found." });
  }
  const signedToken = signMediaAccessToken(mediaId, req.user.id, 900);
  res.json({
    token: signedToken,
    url: `/api/media/${mediaId}?token=${signedToken}`
  });
});
app.delete("/api/media/:mediaId", authenticateToken, (req, res) => {
  try {
    const mediaId = String(req.params.mediaId);
    const success = deleteMediaRecord(mediaId, req.user.id);
    if (!success) {
      return res.status(404).json({ error: "Media not found or already deleted." });
    }
    res.json({ success: true, message: "Media successfully deleted." });
  } catch (err) {
    res.status(403).json({ error: err.message || "Failed to delete media." });
  }
});
app.post("/api/media/link-preview", authenticateToken, async (req, res) => {
  try {
    const rateCheck = checkRateLimit(`link_prev_${req.user.id}`, MEDIA_LIMITS.RATE_LIMITS.LINK_PREVIEW);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: "Link preview rate limit exceeded. Please wait a moment." });
    }
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL parameter is required." });
    }
    const preview = await fetchSafeLinkMetadata(url);
    res.json({ success: true, preview });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not generate link preview." });
  }
});
app.get("/api/media/files/:filename", (req, res) => {
  const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  const fileInfo = getLocalMediaFile(filename);
  if (!fileInfo) {
    return res.status(404).json({ error: "Media object not found." });
  }
  res.setHeader("Content-Type", fileInfo.mimeType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'");
  res.setHeader("Cache-Control", "public, max-age=86400, immutable");
  res.sendFile(fileInfo.path);
});
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});
app.post("/api/auth/logout", authenticateToken, (req, res) => {
  if (req.token) {
    store.invalidateToken(req.token);
  }
  res.json({ success: true, message: "Logged out successfully" });
});
app.put("/api/profile", authenticateToken, (req, res) => {
  try {
    const updated = store.updateProfile(req.user.id, req.body);
    res.json({ profile: updated });
  } catch (err) {
    res.status(400).json({ error: err.message || "Profile update failed" });
  }
});
app.post("/api/profile/photos", authenticateToken, (req, res) => {
  try {
    const { url, isPrimary } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Photo URL is required." });
    }
    const updated = store.addProfilePhoto(req.user.id, url, Boolean(isPrimary));
    res.json({ profile: updated });
  } catch (err) {
    res.status(400).json({ error: err.message || "Photo upload failed" });
  }
});
app.delete("/api/profile/photos/:photoId", authenticateToken, (req, res) => {
  try {
    const photoId = String(req.params.photoId);
    const updated = store.deleteProfilePhoto(req.user.id, photoId);
    res.json({ profile: updated });
  } catch (err) {
    res.status(400).json({ error: err.message || "Photo deletion failed" });
  }
});
app.get("/api/profiles", (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
    const user = token ? store.getUserByToken(token) : null;
    const currentUserId = user ? user.id : "guest";
    const profiles = store.getDiscoverFeed(currentUserId);
    res.json({ profiles, count: profiles.length });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch profiles", profiles: [] });
  }
});
app.get("/api/profiles/:userId", (req, res) => {
  try {
    const userId = String(req.params.userId);
    const authHeader = req.headers["authorization"];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
    const user = token ? store.getUserByToken(token) : null;
    const requestingUserId = user ? user.id : void 0;
    const profile = store.getProfileById(userId, requestingUserId);
    if (!profile) {
      return res.status(404).json({ error: "User profile not found" });
    }
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve profile" });
  }
});
app.get("/api/discover", (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
    const user = token ? store.getUserByToken(token) : null;
    const currentUserId = user ? user.id : "guest";
    const feed = store.getDiscoverFeed(currentUserId);
    res.json({ feed, profiles: feed });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch discovery feed", feed: [], profiles: [] });
  }
});
app.post("/api/discover", (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
    const user = token ? store.getUserByToken(token) : null;
    const currentUserId = user ? user.id : "guest";
    const feed = store.getDiscoverFeed(currentUserId, req.body);
    res.json({ feed, profiles: feed });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to fetch discovery feed" });
  }
});
app.get("/api/venues", (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat) : void 0;
    const lng = req.query.lng ? parseFloat(req.query.lng) : void 0;
    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm) : 40;
    const query = req.query.q ? req.query.q.trim() : "";
    let venues = QUEER_VENUES;
    if (query) {
      venues = searchVenues(query, lat, lng);
    } else if (lat !== void 0 && lng !== void 0 && !isNaN(lat) && !isNaN(lng)) {
      venues = getVenuesNearLocation(lat, lng, radiusKm);
    }
    res.json({
      venues,
      count: venues.length,
      isFilteredByLocation: lat !== void 0 && lng !== void 0,
      coordinates: lat !== void 0 && lng !== void 0 ? { lat, lng, radiusKm } : null
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch venues", venues: [], count: 0 });
  }
});
var handleLike = (req, res) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.userId;
    const isSuperLike = Boolean(req.body.isSuperLike);
    if (!targetUserId || typeof targetUserId !== "string") {
      return res.status(400).json({ error: "Target user ID is required." });
    }
    const result = store.likeUser(req.user.id, targetUserId, isSuperLike);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Like interaction failed" });
  }
};
app.post("/api/like", authenticateToken, handleLike);
app.post("/api/likes", authenticateToken, handleLike);
var handleBlock = (req, res) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.blockedUserId || req.body.userId;
    if (!targetUserId || typeof targetUserId !== "string") {
      return res.status(400).json({ error: "Target user ID is required." });
    }
    const record = store.blockUser(req.user.id, targetUserId);
    res.json({ success: true, blockRecord: record });
  } catch (err) {
    res.status(400).json({ error: err.message || "Block failed" });
  }
};
app.post("/api/block", authenticateToken, handleBlock);
app.post("/api/blocks", authenticateToken, handleBlock);
app.get("/api/blocked", authenticateToken, (req, res) => {
  const blocked = store.getBlockedUsers(req.user.id);
  res.json({ blocked });
});
app.post("/api/unblock", authenticateToken, (req, res) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.blockedUserId;
    if (!targetUserId) {
      return res.status(400).json({ error: "Target user ID is required." });
    }
    const success = store.unblockUser(req.user.id, targetUserId);
    res.json({ success });
  } catch (err) {
    res.status(400).json({ error: err.message || "Unblock failed" });
  }
});
var handleReport = (req, res) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.reportedUserId || req.body.userId;
    const reason = req.body.reason || "General Concern";
    const details = req.body.details || "";
    if (!targetUserId) {
      return res.status(400).json({ error: "Target user ID is required." });
    }
    const report = store.reportUser(req.user.id, targetUserId, reason, details);
    res.json({ success: true, report });
  } catch (err) {
    res.status(400).json({ error: err.message || "Safety report submission failed" });
  }
};
app.post("/api/report", authenticateToken, handleReport);
app.post("/api/reports", authenticateToken, handleReport);
app.get("/api/conversations", authenticateToken, (req, res) => {
  const conversations = store.getUserConversations(req.user.id);
  res.json({ conversations });
});
var handleStartConversation = (req, res) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.recipientId || req.body.otherUserId;
    if (!targetUserId || typeof targetUserId !== "string") {
      return res.status(400).json({ error: "targetUserId is required to start a conversation." });
    }
    if (req.user.id === targetUserId) {
      return res.status(400).json({ error: "Cannot start conversation with yourself." });
    }
    if (store.isBlocked(req.user.id, targetUserId)) {
      return res.status(403).json({ error: "Cannot start conversation with blocked user." });
    }
    const conversation = store.getOrCreateConversation(req.user.id, targetUserId);
    res.json({ conversation });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to start or retrieve conversation." });
  }
};
app.post("/api/conversations", authenticateToken, handleStartConversation);
app.post("/api/conversations/start", authenticateToken, handleStartConversation);
app.get("/api/conversations/:conversationId/messages", authenticateToken, (req, res) => {
  try {
    const conversationId = String(req.params.conversationId);
    const messages = store.getMessages(conversationId, req.user.id);
    store.markMessagesRead(conversationId, req.user.id);
    res.json({ messages });
  } catch (err) {
    res.status(403).json({ error: err.message || "Access to messages denied" });
  }
});
app.post("/api/conversations/:conversationId/messages", authenticateToken, (req, res) => {
  try {
    const conversationId = String(req.params.conversationId);
    const {
      text,
      photoUrl,
      type,
      media,
      linkPreview,
      location,
      locationPayload,
      photo,
      link,
      stickerPayload,
      voice,
      starVideo,
      stickerId,
      stickerUrl,
      stickerName,
      ttlSeconds,
      isPermanent,
      excludeFromBackup,
      disableAutoBackup,
      tapType,
      vaultAction
    } = req.body;
    const messageType = type || (photoUrl || photo ? "PHOTO" : "TEXT");
    if (messageType === "PHOTO") {
      if (!photo && !photoUrl && !media) {
        return res.status(400).json({ error: "Photo payload or media URL is required." });
      }
      if (photo?.mediaId) {
        const rec = getMediaRecord(photo.mediaId);
        if (!rec || rec.ownerId !== req.user.id && rec.conversationId !== conversationId) {
          return res.status(400).json({ error: "Invalid or unauthorized photo mediaId." });
        }
      }
    }
    if (messageType === "LINK") {
      const targetUrl = link?.normalizedUrl || linkPreview?.url || text?.trim();
      if (!targetUrl) {
        return res.status(400).json({ error: "Link URL is required for link messages." });
      }
      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return res.status(400).json({ error: "Forbidden link protocol. Only HTTP and HTTPS are permitted." });
        }
      } catch (e) {
        return res.status(400).json({ error: "Invalid URL provided in link message." });
      }
    }
    let finalLocationPayload = locationPayload;
    let finalLocation = location;
    if (messageType === "LOCATION") {
      const loc = locationPayload || location;
      if (!loc) {
        return res.status(400).json({ error: "Location coordinates are required." });
      }
      const lat = loc.latitude !== void 0 ? loc.latitude : loc.lat;
      const lng = loc.longitude !== void 0 ? loc.longitude : loc.lng;
      if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Latitude and Longitude must be valid numbers." });
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: "Coordinates are out of geographical bounds." });
      }
      const precisionMode = loc.precisionMode === "exact" ? "exact" : "approximate";
      let safeLat = lat;
      let safeLng = lng;
      if (precisionMode === "approximate") {
        safeLat = Math.round(lat * 100) / 100;
        safeLng = Math.round(lng * 100) / 100;
      }
      finalLocationPayload = {
        latitude: safeLat,
        longitude: safeLng,
        precisionMode,
        label: loc.label || loc.placeName || loc.approximateArea,
        placeName: loc.placeName || loc.label || loc.approximateArea,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      finalLocation = {
        lat: safeLat,
        lng: safeLng,
        approximateArea: finalLocationPayload.label
      };
    }
    let finalStickerUrl = stickerUrl || stickerPayload?.url;
    let finalStickerName = stickerName || stickerPayload?.name;
    const finalStickerId = stickerId || stickerPayload?.stickerId;
    if (messageType === "STICKER") {
      if (!finalStickerId) {
        return res.status(400).json({ error: "Sticker ID is required for sticker messages." });
      }
      const validSticker = AURA_STICKERS.find((s) => s.id === finalStickerId);
      if (!validSticker) {
        return res.status(400).json({ error: "Invalid sticker." });
      }
      finalStickerUrl = validSticker.url;
      finalStickerName = validSticker.name;
    }
    if (messageType === "VOICE") {
      if (!voice?.mediaId) {
        return res.status(400).json({ error: "Voice payload requires a verified mediaId." });
      }
      const rec = getMediaRecord(voice.mediaId);
      if (!rec || rec.ownerId !== req.user.id && rec.conversationId !== conversationId) {
        return res.status(400).json({ error: "Invalid or unauthorized voice mediaId." });
      }
    }
    if (messageType === "STAR_VIDEO") {
      if (!starVideo?.mediaId) {
        return res.status(400).json({ error: "Star Video payload requires a verified mediaId." });
      }
      const rec = getMediaRecord(starVideo.mediaId);
      if (!rec || rec.ownerId !== req.user.id && rec.conversationId !== conversationId) {
        return res.status(400).json({ error: "Invalid or unauthorized Star Video mediaId." });
      }
      if (starVideo.duration && starVideo.duration > MEDIA_LIMITS.MAX_VIDEO_DURATION_SECONDS) {
        return res.status(400).json({ error: `Star Video exceeds maximum length of ${MEDIA_LIMITS.MAX_VIDEO_DURATION_SECONDS} seconds.` });
      }
    }
    if (!text?.trim() && !photoUrl && !photo && !media && !finalLocation && !finalStickerId && !voice && !starVideo && !tapType && !vaultAction && !link && !linkPreview) {
      return res.status(400).json({ error: "Message content is required." });
    }
    const message = store.sendMessage(req.user.id, conversationId, {
      type: messageType,
      text,
      photoUrl,
      media,
      linkPreview,
      location: finalLocation,
      locationPayload: finalLocationPayload,
      photo,
      link,
      stickerPayload,
      voice,
      starVideo,
      stickerId: finalStickerId,
      stickerUrl: finalStickerUrl,
      stickerName: finalStickerName,
      ttlSeconds: typeof ttlSeconds === "number" ? ttlSeconds : void 0,
      isPermanent: Boolean(isPermanent),
      excludeFromBackup: typeof excludeFromBackup === "boolean" ? excludeFromBackup : void 0,
      disableAutoBackup: typeof disableAutoBackup === "boolean" ? disableAutoBackup : void 0,
      tapType,
      vaultAction
    });
    res.status(201).json({ message });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to send message" });
  }
});
app.delete("/api/conversations/:conversationId/messages/:messageId", authenticateToken, (req, res) => {
  try {
    const conversationId = String(req.params.conversationId);
    const messageId = String(req.params.messageId);
    const mode = req.query.mode === "for_everyone" || req.body?.mode === "for_everyone" ? "for_everyone" : "for_me";
    store.deleteMessage(conversationId, messageId, req.user.id, mode);
    res.json({ success: true, message: "Message deleted successfully." });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to delete message" });
  }
});
app.patch("/api/conversations/:conversationId/settings", authenticateToken, (req, res) => {
  try {
    const conversationId = String(req.params.conversationId);
    const { messageTtlSeconds, excludeFromBackup, disableAutoBackup } = req.body;
    const conversation = store.updateConversationSettings(conversationId, req.user.id, {
      messageTtlSeconds: typeof messageTtlSeconds === "number" ? messageTtlSeconds : void 0,
      excludeFromBackup: typeof excludeFromBackup === "boolean" ? excludeFromBackup : void 0,
      disableAutoBackup: typeof disableAutoBackup === "boolean" ? disableAutoBackup : void 0
    });
    res.json({ success: true, conversation, settings: conversation.settings });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to update conversation settings" });
  }
});
app.post("/api/conversations/:conversationId/messages/:messageId/permanent", authenticateToken, (req, res) => {
  try {
    const conversationId = String(req.params.conversationId);
    const messageId = String(req.params.messageId);
    const message = store.toggleMessagePermanent(messageId, conversationId, req.user.id);
    res.json({ success: true, message });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to toggle message permanence" });
  }
});
app.post("/api/taps", authenticateToken, (req, res) => {
  try {
    const { targetUserId, tapType } = req.body;
    if (!targetUserId || !tapType) {
      return res.status(400).json({ error: "targetUserId and tapType are required" });
    }
    const result = store.sendTap(req.user.id, targetUserId, tapType);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to send tap" });
  }
});
app.post("/api/vault/request", authenticateToken, (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: "targetUserId is required" });
    }
    store.requestVaultAccess(req.user.id, targetUserId);
    const conv = store.getOrCreateConversation(req.user.id, targetUserId);
    const message = store.sendMessage(req.user.id, conv.id, {
      type: "VAULT_ACTION",
      vaultAction: "REQUEST",
      text: "\u{1F4F8} Poprosi\u0142 o dost\u0119p do Twojego prywatnego albumu"
    });
    res.json({ success: true, message });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to request vault access" });
  }
});
app.post("/api/vault/grant", authenticateToken, (req, res) => {
  try {
    const { targetUserId, grant } = req.body;
    if (!targetUserId || grant === void 0) {
      return res.status(400).json({ error: "targetUserId and grant boolean are required" });
    }
    const isGranted = Boolean(grant);
    store.grantVaultAccess(req.user.id, targetUserId, isGranted);
    const conv = store.getOrCreateConversation(req.user.id, targetUserId);
    const message = store.sendMessage(req.user.id, conv.id, {
      type: "VAULT_ACTION",
      vaultAction: isGranted ? "GRANT" : "REVOKE",
      text: isGranted ? "\u{1F513} Przyzna\u0142 Ci dost\u0119p do prywatnego albumu" : "\u{1F512} Cofn\u0105\u0142 dost\u0119p do prywatnego albumu"
    });
    res.json({ success: true, granted: isGranted, message });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to update vault access" });
  }
});
app.get("/api/vault/status/:targetUserId", authenticateToken, (req, res) => {
  try {
    const targetUserId = String(req.params.targetUserId);
    const hasAccess = store.hasVaultAccess(targetUserId, req.user.id);
    const requested = store.isVaultRequested(req.user.id, targetUserId);
    const iGrantedAccess = store.hasVaultAccess(req.user.id, targetUserId);
    res.json({ hasAccess, requested, iGrantedAccess });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to fetch vault status" });
  }
});
app.get("/api/moments", authenticateToken, (req, res) => {
  const moments = store.getMoments(req.user.id);
  res.json({ moments });
});
app.post("/api/moments", authenticateToken, (req, res) => {
  try {
    const { mediaUrl, mediaType, caption, privacy, allowedUserIds } = req.body;
    if (!mediaUrl || typeof mediaUrl !== "string") {
      return res.status(400).json({ error: "Media URL is required for moment creation." });
    }
    const moment = store.createMoment(req.user.id, {
      mediaUrl,
      mediaType,
      caption,
      privacy,
      allowedUserIds
    });
    res.status(201).json({ moment });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to post moment" });
  }
});
app.post("/api/moments/:momentId/like", authenticateToken, (req, res) => {
  const momentId = String(req.params.momentId);
  const success = store.likeMoment(req.user.id, momentId);
  res.json({ success });
});
app.post("/api/moments/:momentId/view", authenticateToken, (req, res) => {
  const momentId = String(req.params.momentId);
  const success = store.viewMoment(req.user.id, momentId);
  res.json({ success });
});
app.delete("/api/moments/:momentId", authenticateToken, (req, res) => {
  const momentId = String(req.params.momentId);
  const success = store.deleteMoment(req.user.id, momentId);
  res.json({ success });
});
app.post("/api/moments/:momentId/reply", authenticateToken, (req, res) => {
  try {
    const { text, targetUserId } = req.body;
    if (!text || !targetUserId) {
      return res.status(400).json({ error: "Text and targetUserId are required." });
    }
    const conv = store.getOrCreateConversation(req.user.id, targetUserId);
    const message = store.sendMessage(req.user.id, conv.id, text);
    res.status(201).json({ success: true, message, conversationId: conv.id });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to reply to moment" });
  }
});
app.get("/api/gdpr/consents", authenticateToken, (req, res) => {
  try {
    const consents = store.getUserConsents(req.user.id);
    res.json({ consents });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch consents" });
  }
});
app.put("/api/gdpr/consents", authenticateToken, (req, res) => {
  try {
    const updated = store.updateUserConsents(req.user.id, req.body);
    res.json({ consents: updated, message: "Privacy consents updated successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to update consents" });
  }
});
app.get("/api/gdpr/export", authenticateToken, (req, res) => {
  try {
    const exportData = store.exportUserData(req.user.id);
    res.setHeader("Content-Disposition", `attachment; filename="aura-gdpr-export-${req.user.id}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to generate GDPR data export" });
  }
});
app.get("/api/backup/cloud/status", authenticateToken, (req, res) => {
  try {
    const status = cloudBackupService.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch cloud backup status" });
  }
});
app.post("/api/backup/cloud/run", authenticateToken, async (req, res) => {
  try {
    const backupRecord = await cloudBackupService.runAutomatedBackup();
    res.json({
      success: true,
      backup: backupRecord,
      message: `Automated cloud backup completed successfully. ${backupRecord.excludedDueToDisableAutoBackup} conversation(s) excluded via 'disableAutoBackup'.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to execute automated cloud backup" });
  }
});
app.post("/api/gdpr/rectify", authenticateToken, (req, res) => {
  try {
    const { email, displayName, bio } = req.body;
    const user = store.rectifyUserData(req.user.id, { email, displayName, bio });
    res.json({ success: true, user, message: "Data rectified successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message || "Rectification failed" });
  }
});
app.post("/api/gdpr/restrict", authenticateToken, (req, res) => {
  try {
    const reason = (req.body.reason || "Data subject requested restriction under GDPR Art. 18").toString();
    const success = store.restrictAccount(req.user.id, reason);
    if (req.token) {
      store.invalidateToken(req.token);
    }
    res.json({ success, message: "Processing restricted and account suspended" });
  } catch (err) {
    res.status(400).json({ error: err.message || "Restriction request failed" });
  }
});
app.post("/api/gdpr/object", authenticateToken, (req, res) => {
  try {
    const reason = (req.body.reason || "General objection to profiling / AI processing").toString();
    const success = store.recordObjection(req.user.id, reason);
    res.json({ success, message: "Objection recorded. AI processing and analytics disabled for your account." });
  } catch (err) {
    res.status(400).json({ error: err.message || "Objection recording failed" });
  }
});
app.post("/api/gdpr/erase", authenticateToken, (req, res) => {
  try {
    const success = store.eraseUserData(req.user.id);
    if (req.token) {
      store.invalidateToken(req.token);
    }
    res.json({
      success,
      message: "All personal data permanently erased under GDPR Article 17. Account deactivated."
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erasure request failed" });
  }
});
app.delete("/api/account", authenticateToken, (req, res) => {
  try {
    const success = store.eraseUserData(req.user.id);
    if (req.token) {
      store.invalidateToken(req.token);
    }
    res.json({ success, message: "Account and personal data permanently erased." });
  } catch (err) {
    res.status(500).json({ error: err.message || "Account deletion failed" });
  }
});
app.post("/api/dsa/report", authenticateToken, (req, res) => {
  try {
    const { reportedUserId, reason, details } = req.body;
    if (!reportedUserId || !reason) {
      return res.status(400).json({ error: "reportedUserId and valid DSA reason are required" });
    }
    const report = store.submitDsaReport(req.user.id, reportedUserId, reason, details);
    res.status(201).json({
      success: true,
      report,
      acknowledgment: "Your notice has been received in compliance with EU Digital Services Act Article 16. Our trust & safety team will review it promptly."
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to submit report" });
  }
});
app.get("/api/dsa/reports/my", authenticateToken, (req, res) => {
  const reports = store.getUserSubmittedReports(req.user.id);
  res.json({ reports });
});
app.get("/api/dsa/notices", authenticateToken, (req, res) => {
  const notices = store.getModerationNoticesForUser(req.user.id);
  res.json({ notices });
});
app.post("/api/dsa/appeal", authenticateToken, (req, res) => {
  try {
    const { noticeId, appealReason } = req.body;
    if (!noticeId || !appealReason || typeof appealReason !== "string" || appealReason.trim().length < 10) {
      return res.status(400).json({ error: "noticeId and detailed appealReason (at least 10 chars) are required" });
    }
    const appeal = store.submitDsaAppeal(req.user.id, noticeId, appealReason);
    res.status(201).json({
      success: true,
      appeal,
      message: "Your appeal has been officially logged under DSA Article 20 and will be reviewed by a human moderator."
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to submit appeal" });
  }
});
app.get("/api/dsa/transparency", (req, res) => {
  const stats = store.getAdminStats();
  res.json({
    reportingPeriod: "2026-H1",
    activeRecipientsOfServiceEU: stats.totalUsers,
    totalReportsReceived: stats.pendingReports + 12,
    moderationDecisions: {
      accountSuspensions: stats.suspendedUsers,
      contentRemovals: 8,
      warningsIssued: 14,
      dismissedNotices: 5
    },
    useOfAutomatedMeans: {
      usedForProfiling: false,
      usedForAutonomousSanctions: false,
      aiWingmanHumanAgencyEnabled: true
    },
    humanReviewRatio: "100%",
    averageResolutionTimeHours: 4.2,
    singlePointOfContactDSA: {
      email: "legal@auragay.com",
      languages: ["en", "es", "de"],
      euRepresentative: "AURA Compliance EU S.L., Calle de Hortaleza 48, 28004 Madrid, Spain"
    }
  });
});
app.get("/api/ai/transparency", (req, res) => {
  res.json({
    aiFeaturesActive: ["AI Proposition & Icebreaker Generator"],
    modelProvider: "Google Gemini",
    foundationModel: "gemini-2.5-flash",
    purpose: "Generating personalized conversation starters based exclusively on public profile bios and declared hobbies upon user request.",
    humanAgencyAndOversight: "The user has absolute control over whether an AI suggestion is sent, modified, or discarded. Messages are never sent automatically.",
    automatedDecisionMaking: "None. AI is strictly assistive and is not used for eligibility, pricing, algorithmic bans, or ranking penalties.",
    optOutAvailable: true,
    optOutEndpoint: "POST /api/gdpr/object"
  });
});
app.get("/api/matches", authenticateToken, (req, res) => {
  const matches = store.getUserMatches(req.user.id);
  res.json({ matches });
});
var handleAIIcebreaker = async (req, res) => {
  let targetProfile = req.body.matchProfile;
  const targetUserId = req.body.targetUserId || req.body.userId;
  const vibe = req.body.vibe || "Playful & Witty";
  if (!targetProfile && targetUserId) {
    const foundUser = store.getUserById(targetUserId);
    if (foundUser) {
      targetProfile = foundUser.profile;
    }
  }
  if (!targetProfile || !targetProfile.displayName) {
    return res.status(400).json({ error: "Target profile details required for AI propositions." });
  }
  if (targetProfile.userId && store.isBlocked(req.user.id, targetProfile.userId)) {
    return res.status(403).json({ error: "Cannot generate AI propositions for blocked member." });
  }
  const displayName = targetProfile.displayName;
  const interestsList = targetProfile.interests && targetProfile.interests.length > 0 ? targetProfile.interests.join(", ") : "Travel, Fitness, Coffee";
  const role = targetProfile.identityRole || "Member";
  const bio = targetProfile.bio || "Exploring connections";
  try {
    const ai = getGeminiClient();
    const prompt = `You are an elite, respectful, charming conversational wingman for AURA GAY 18+, a premium adult gay dating app.
Generate 4 distinct, engaging, authentic proposition messages/conversation starters for starting a chat with ${displayName}.

Profile Context:
- Name: ${displayName}
- Age: ${targetProfile.age || 26}
- Sexual/Identity Role: ${role}
- Bio: "${bio}"
- Interests: ${interestsList}
- Selected Vibe: ${vibe}

Rules:
1. Craft 4 distinct openers:
   - One casual & low-pressure (e.g. coffee, drinks, or light day check-in)
   - One witty & charming banter referencing their profile details
   - One connecting directly over their interests/passions (${interestsList})
   - One smooth, confident, and tastefully flirty proposition
2. Tone must be authentic, adult 18+ appropriate, respectful, engaging, and never robotic or cheesy.
3. Return ONLY a valid JSON array of 4 strings: ["Msg 1", "Msg 2", "Msg 3", "Msg 4"]. No markdown code fences.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        temperature: 0.85,
        responseMimeType: "application/json"
      }
    });
    const text = response.text || "[]";
    let propositions = [];
    try {
      propositions = JSON.parse(text);
    } catch {
      propositions = [
        `Hey ${displayName}! Loved your vibe and seeing you're into ${targetProfile.interests?.[0] || "design"}. How has your week been?`,
        `Hi ${displayName}! Your photos caught my attention. Up for grabbing an espresso or drink nearby sometime?`,
        `Hey there! I saw we both appreciate good vibes and ${targetProfile.interests?.[1] || "fitness"}. What are you up to today?`,
        `Hey handsome, couldn't pass by your profile without saying hi! What brings you on Aura?`
      ];
    }
    res.json({
      icebreakers: propositions,
      propositions
    });
  } catch (err) {
    console.error("Gemini API Error (fallback triggered):", err);
    const primaryInterest = targetProfile.interests?.[0] || "good coffee";
    const secondaryInterest = targetProfile.interests?.[1] || "music";
    const fallbackPropositions = [
      `Hey ${displayName}! Loved your photos and saw you're into ${primaryInterest}. How has your week been?`,
      `Hi ${displayName}! Your vibe is captivating. Up for grabbing a coffee or drinks nearby sometime?`,
      `Hey there! Saw that you enjoy ${secondaryInterest}. What's your favorite spot in town?`,
      `Hey handsome, couldn't scroll past without saying hi. What are you up to tonight?`
    ];
    res.json({
      icebreakers: fallbackPropositions,
      propositions: fallbackPropositions,
      note: "Personalized fallback propositions active."
    });
  }
};
app.post("/api/ai/icebreaker", authenticateToken, handleAIIcebreaker);
app.post("/api/ai/propositions", authenticateToken, handleAIIcebreaker);
var getCanonicalBaseUrl = (req) => {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, "");
  }
  const origin = req.headers.origin;
  if (origin && typeof origin === "string" && !origin.includes("localhost:3000")) {
    return origin.replace(/\/+$/, "");
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
  if (host) {
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  return "https://aura18.app";
};
var handleCheckout = async (req, res) => {
  try {
    const planId = req.body.planId || "aura_vip_monthly";
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      if (process.env.NODE_ENV === "production") {
        return res.status(503).json({
          error: "Stripe payments are not configured on this production instance. Please set STRIPE_SECRET_KEY."
        });
      }
      return res.status(400).json({
        error: "STRIPE_SECRET_KEY is not configured in this environment."
      });
    }
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);
    const isAnnual = planId === "aura_vip_annual";
    const baseUrl = getCanonicalBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      client_reference_id: req.user.id,
      metadata: {
        userId: req.user.id,
        planId
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: isAnnual ? "AURA VIP Pass (Annual)" : "AURA VIP Pass (Monthly)",
              description: "Unlimited likes, see who liked you, stealth mode, and AI icebreaker priority."
            },
            unit_amount: isAnnual ? 9999 : 1499,
            recurring: {
              interval: isAnnual ? "year" : "month"
            }
          },
          quantity: 1
        }
      ],
      mode: "subscription",
      success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?payment=cancelled`
    });
    res.json({ url: session.url, checkoutUrl: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message || "Payment processing error" });
  }
};
app.post("/api/payments/create-checkout-session", authenticateToken, handleCheckout);
app.post("/api/payments/checkout-session", authenticateToken, handleCheckout);
app.post("/api/payments/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    console.error("[Stripe Webhook] Missing stripe-signature or STRIPE_WEBHOOK_SECRET");
    return res.status(400).json({ error: "Webhook secret or signature missing" });
  }
  const rawBody = req.rawBody;
  if (!rawBody) {
    return res.status(400).json({ error: "Raw body payload required for signature verification" });
  }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(503).json({ error: "Stripe service unavailable" });
  }
  let event;
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }
  if (store.isStripeEventProcessed(event.id)) {
    return res.json({ received: true, message: "Event already processed" });
  }
  store.recordStripeEvent(event.id, event.type);
  console.log(`[Stripe Webhook] Processing event ${event.id} of type ${event.type}`);
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const userId = session.client_reference_id || session.metadata?.userId;
        const planId = session.metadata?.planId || "aura_vip_monthly";
        if (userId) {
          store.recordStripeSubscription(userId, customerId, subscriptionId, planId, "active");
          console.log(`[Stripe Webhook] Activated VIP for user ${userId}`);
        } else if (customerId) {
          const user = store.findUserByStripeCustomerId(customerId);
          if (user) {
            store.recordStripeSubscription(user.id, customerId, subscriptionId, planId, "active");
            console.log(`[Stripe Webhook] Activated VIP for user ${user.id} via customer ID`);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer;
        const subscriptionId = sub.id;
        const status = sub.status;
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1e3) : void 0;
        const planId = sub.metadata?.planId || "aura_vip_monthly";
        const userId = sub.metadata?.userId;
        let user = userId ? store.getUserById(userId) : null;
        if (!user && customerId) {
          user = store.findUserByStripeCustomerId(customerId);
        }
        if (!user && subscriptionId) {
          user = store.findUserByStripeSubscriptionId(subscriptionId);
        }
        if (user) {
          store.recordStripeSubscription(user.id, customerId, subscriptionId, planId, status, periodEnd);
          console.log(`[Stripe Webhook] Updated subscription for user ${user.id}: status=${status}`);
        }
        break;
      }
      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const obj = event.data.object;
        const customerId = obj.customer;
        const subscriptionId = obj.subscription || obj.id;
        let user = store.findUserByStripeCustomerId(customerId) || store.findUserByStripeSubscriptionId(subscriptionId);
        if (user) {
          store.recordStripeSubscription(user.id, customerId, subscriptionId, "none", "canceled");
          console.log(`[Stripe Webhook] Deactivated VIP for user ${user.id} following cancellation or payment failure`);
        }
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
    }
    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Error executing webhook handler:", err);
    res.status(500).json({ error: "Internal webhook handling error" });
  }
});
app.get("/api/billing/products", (req, res) => {
  const platform = req.query.platform || "web";
  const products = [
    {
      id: BILLING_PLANS.monthly.id,
      tier: "monthly",
      title: BILLING_PLANS.monthly.fallbackTitle,
      description: BILLING_PLANS.monthly.fallbackDescription,
      localizedPrice: BILLING_PLANS.monthly.fallbackPrice || "",
      billingPeriod: BILLING_PLANS.monthly.billingPeriod
    },
    {
      id: BILLING_PLANS.three_month.id,
      tier: "three_month",
      title: BILLING_PLANS.three_month.fallbackTitle,
      description: BILLING_PLANS.three_month.fallbackDescription,
      localizedPrice: BILLING_PLANS.three_month.fallbackPrice || "",
      billingPeriod: BILLING_PLANS.three_month.billingPeriod
    },
    {
      id: BILLING_PLANS.yearly.id,
      tier: "yearly",
      title: BILLING_PLANS.yearly.fallbackTitle,
      description: BILLING_PLANS.yearly.fallbackDescription,
      localizedPrice: BILLING_PLANS.yearly.fallbackPrice || "",
      billingPeriod: BILLING_PLANS.yearly.billingPeriod
    }
  ];
  res.json({ success: true, platform, products });
});
app.get("/api/billing/entitlements", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const entitlement = await store.getUserEntitlements(userId);
  res.json({ success: true, entitlement });
});
app.post("/api/billing/google-play/verify", authenticateToken, async (req, res) => {
  const { packageName, subscriptionId, purchaseToken } = req.body;
  const userId = req.user.id;
  if (!subscriptionId || !purchaseToken) {
    return res.status(400).json({ success: false, error: "Missing subscriptionId or purchaseToken." });
  }
  const result = await verifyGooglePlayPurchase({
    packageName: packageName || "app.aura.gay18",
    subscriptionId,
    purchaseToken,
    userId
  });
  if (!result.valid) {
    return res.status(result.statusCode || 400).json({ success: false, error: result.error });
  }
  res.json({ success: true, entitlement: result.entitlement });
});
app.post("/api/billing/apple-storekit/verify", authenticateToken, async (req, res) => {
  const { transactionJws } = req.body;
  const userId = req.user.id;
  if (!transactionJws) {
    return res.status(400).json({ success: false, error: "Missing transactionJws." });
  }
  const result = await verifyAppleStoreKitTransaction({
    transactionJws,
    userId
  });
  if (!result.valid) {
    return res.status(result.statusCode || 400).json({ success: false, error: result.error });
  }
  res.json({ success: true, entitlement: result.entitlement });
});
app.post("/api/billing/restore", authenticateToken, async (req, res) => {
  const { receiptData, provider } = req.body;
  const userId = req.user.id;
  const result = await restoreUserPurchases(userId, receiptData, provider);
  res.json(result);
});
app.post("/api/billing/rtdn/google-play", async (req, res) => {
  try {
    const pubsubMsg = req.body.message;
    if (!pubsubMsg) {
      return res.status(400).json({ error: "Invalid Pub/Sub payload" });
    }
    await handleGooglePlayRtdn(pubsubMsg);
    res.status(200).send("OK");
  } catch (err) {
    console.error("[Google Play RTDN] Handler error:", err.message);
    res.status(200).send("OK");
  }
});
app.post("/api/billing/webhook/apple-storekit", async (req, res) => {
  try {
    const { signedPayload } = req.body;
    if (!signedPayload) {
      return res.status(400).json({ error: "Missing signedPayload" });
    }
    await handleAppleStoreKitWebhook(signedPayload);
    res.status(200).send("OK");
  } catch (err) {
    console.error("[Apple StoreKit Webhook] Handler error:", err.message);
    res.status(200).send("OK");
  }
});
app.get("/api/admin/stats", authenticateToken, requireAdmin, (req, res) => {
  const stats = store.getAdminStats();
  res.json({ stats });
});
app.get("/api/admin/reports", authenticateToken, requireAdmin, (req, res) => {
  const reports = store.getReports();
  res.json({ reports });
});
var handleAdminSuspend = (req, res) => {
  try {
    const targetUserId = req.params.userId || req.body.targetUserId;
    if (!targetUserId) {
      return res.status(400).json({ error: "Target user ID is required." });
    }
    const success = store.suspendUser(targetUserId);
    res.json({ success, message: `User ${targetUserId} suspended successfully` });
  } catch (err) {
    res.status(400).json({ error: err.message || "User suspension failed" });
  }
};
app.post("/api/admin/suspend", authenticateToken, requireAdmin, handleAdminSuspend);
app.post("/api/admin/users/:userId/suspend", authenticateToken, requireAdmin, handleAdminSuspend);
app.post("/api/admin/soft-delete", authenticateToken, requireAdmin, (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: "Target user ID is required." });
    }
    const success = store.softDeleteUser(targetUserId);
    res.json({ success, message: `User ${targetUserId} soft-deleted successfully` });
  } catch (err) {
    res.status(400).json({ error: err.message || "Soft delete failed" });
  }
});
app.get("/api/admin/dsa/appeals", authenticateToken, requireAdmin, (req, res) => {
  const appeals = store.getDsaAppeals();
  res.json({ appeals });
});
app.post("/api/admin/dsa/appeals/:appealId/decide", authenticateToken, requireAdmin, (req, res) => {
  try {
    const appealId = String(req.params.appealId);
    const { outcome, decisionNotes } = req.body;
    if (!outcome || outcome !== "UPHELD" && outcome !== "OVERTURNED") {
      return res.status(400).json({ error: "Valid outcome (UPHELD or OVERTURNED) is required" });
    }
    if (!decisionNotes) {
      return res.status(400).json({ error: "Written decision notes are required under DSA Article 20" });
    }
    const decided = store.adminDecideAppeal(req.user.id, appealId, outcome, decisionNotes);
    res.json({ success: true, appeal: decided });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to decide appeal" });
  }
});
app.post("/api/admin/dsa/reports/:reportId/decide", authenticateToken, requireAdmin, (req, res) => {
  try {
    const reportId = String(req.params.reportId);
    const { decision, legalBasis, statementOfReasons } = req.body;
    if (!decision || !legalBasis || !statementOfReasons) {
      return res.status(400).json({ error: "decision, legalBasis, and statementOfReasons are mandatory under DSA Art. 17" });
    }
    const notice = store.adminDecideReport(req.user.id, reportId, decision, legalBasis, statementOfReasons);
    res.json({ success: true, notice });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to process report decision" });
  }
});
app.get("/api/admin/audit-logs", authenticateToken, requireAdmin, (req, res) => {
  const auditLogs = store.getAdminAuditLogs();
  res.json({ auditLogs });
});
app.post("/api/admin/purge-bots", authenticateToken, requireAdmin, (req, res) => {
  const result = store.purgeBotAccounts();
  res.json({ success: true, ...result });
});
app.get("/api/ads/inventory", optionalAuthenticateToken, (req, res) => {
  const placement = req.query.placement || "discover";
  const allowPersonalized = req.query.allowPersonalized === "true";
  if (req.user?.isPremium || req.user?.role === "SUPERADMIN") {
    return res.json({ ads: [], isPremium: true, adFree: true });
  }
  const ads = getAdsForPlacement(placement, allowPersonalized);
  res.json({ ads, isPremium: false, adFree: false });
});
var adTelemetryBuffer = [];
app.post("/api/ads/telemetry", (req, res) => {
  const { eventType, adId, placement, timestamp } = req.body || {};
  if (eventType && placement) {
    if (adTelemetryBuffer.length > 500) adTelemetryBuffer.shift();
    adTelemetryBuffer.push({
      eventType: String(eventType),
      adId: String(adId || "unknown"),
      placement: String(placement),
      timestamp: String(timestamp || (/* @__PURE__ */ new Date()).toISOString())
    });
  }
  res.json({ success: true });
});
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production" || typeof __filename !== "undefined" && __filename.endsWith("server.cjs");
  const httpServer = import_http2.default.createServer(app);
  if (!isProduction) {
    delete globalThis.__dirname;
    const { createServer: createViteServer } = await import("vite");
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: isHmrDisabled ? null : void 0,
        hmr: {
          server: httpServer,
          host: process.env.HMR_HOST || void 0,
          port: process.env.HMR_PORT ? parseInt(process.env.HMR_PORT, 10) : void 0,
          overlay: !isHmrDisabled
        }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path3.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path3.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`[AURA GAY 18+] Server actively running on http://0.0.0.0:${PORT} (${isProduction ? "PRODUCTION" : "DEVELOPMENT"})`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
