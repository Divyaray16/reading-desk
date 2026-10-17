import {
  normalizeName,
  publications,
  type Publication,
} from "./publications.js";
import { type AddedPublication, type PublicationRecord } from "./desk-memory.js";

export type ActivePublication = {
  id: string;
  name: string;
  url: string;
  hosts: string[];
  origin: "map" | "added";
};

type KnownPublication = ActivePublication & { dropped: boolean };

function fromMap(publication: Publication, dropped: boolean): KnownPublication {
  return {
    id: publication.id,
    name: publication.name,
    url: publication.url,
    hosts: [...publication.hosts],
    origin: "map",
    dropped,
  };
}

function fromAdded(publication: AddedPublication, dropped: boolean): KnownPublication {
  return {
    id: publication.id,
    name: publication.name,
    url: publication.url,
    hosts: [publication.host],
    origin: "added",
    dropped,
  };
}

export function knownPublications(record: PublicationRecord): KnownPublication[] {
  const dropped = new Set(record.dropped);
  const list: KnownPublication[] = publications.map((publication) =>
    fromMap(publication, dropped.has(publication.id)),
  );
  for (const added of record.added) {
    if (list.some((publication) => publication.id === added.id)) continue;
    list.push(fromAdded(added, dropped.has(added.id)));
  }
  return list;
}

export function activePublications(record: PublicationRecord): ActivePublication[] {
  return knownPublications(record)
    .filter((publication) => !publication.dropped)
    .map(({ dropped: _dropped, ...publication }) => publication);
}

export function allowedHosts(list: readonly { hosts: readonly string[] }[]): string[] {
  const hosts = new Set<string>();
  for (const publication of list) {
    for (const host of publication.hosts) hosts.add(host);
  }
  return [...hosts];
}

function matchesQuery(query: string, publication: { id: string; name: string }): boolean {
  const needle = normalizeName(query);
  if (needle.length === 0) return false;
  const name = normalizeName(publication.name);
  const id = normalizeName(publication.id);
  if (needle === name || needle === id) return true;
  return needle.length >= 4 && (name.includes(needle) || id.includes(needle));
}

export function matchPublications(query: string, record: PublicationRecord): KnownPublication[] {
  return knownPublications(record).filter((publication) => matchesQuery(query, publication));
}
