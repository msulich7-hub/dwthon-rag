import { Migration } from '@mikro-orm/migrations'

export class Migration20260523160000_call_transcripts extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "call_transcripts" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "provider_key" text not null, "external_recording_id" text not null, "source_meeting_url" text null, "occurred_at" timestamptz not null, "duration_sec" int null, "language" text null, "title" text null, "text" text not null, "segments_json" text null, "provider_metadata_json" text null, "projection_status" text not null, "interaction_id" uuid null, "primary_entity_id" uuid null, "deal_id" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "call_transcripts_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "call_transcripts_tenant_provider_recording_uidx" on "call_transcripts" ("tenant_id", "provider_key", "external_recording_id");`,
    )
    this.addSql(
      `create index if not exists "call_transcripts_scope_occurred_idx" on "call_transcripts" ("tenant_id", "organization_id", "occurred_at");`,
    )

    this.addSql(
      `create table if not exists "call_transcript_participants" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "call_transcript_id" uuid not null, "email" text null, "phone" text null, "display_name" text null, "role" text null, "customer_entity_id" uuid null, "matched_via" text null, constraint "call_transcript_participants_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index if not exists "call_transcript_participants_transcript_idx" on "call_transcript_participants" ("call_transcript_id");`,
    )

    this.addSql(
      `create table if not exists "call_transcript_unmatched" ("id" uuid not null default gen_random_uuid(), "tenant_id" uuid not null, "organization_id" uuid not null, "call_transcript_id" uuid not null, "participants_summary_json" text not null, "status" text not null default 'pending', "created_at" timestamptz not null, constraint "call_transcript_unmatched_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index if not exists "call_transcript_unmatched_transcript_uidx" on "call_transcript_unmatched" ("call_transcript_id");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "call_transcript_unmatched" cascade;`)
    this.addSql(`drop table if exists "call_transcript_participants" cascade;`)
    this.addSql(`drop table if exists "call_transcripts" cascade;`)
  }
}
