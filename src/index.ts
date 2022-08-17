import assign from "lodash.assign";
import isArray from "lodash.isarray";
import mapValues from "lodash.mapvalues";
import merge from "lodash.merge";

import {
  Document,
  Multiple,
  Serialization,
  Resource,
  ResourceId,
  RelationshipObj,
  RelationsHash,
} from "./interfaces";

export function deserialize(doc: Document): Serialization {
  return denormalize(doc.data, createRelationshipsHash(doc));
}

function createRelationshipsHash(doc: Document): RelationsHash {
  let result: RelationsHash = {};

  if (doc.included) {
    doc.included.forEach((resource: Resource) => {
      let { id, type } = resource;
      merge(result, { [type]: { [id]: resource } });
    });
  }

  return result;
}

function denormalize(
  resources: Multiple<Resource>,
  relations: RelationsHash
): any {
  return fmapMultiple(
    resources,
    (resource: Resource): Serialization => processResource(resource, relations)
  );
}

function processResource(res: Resource, relHash: RelationsHash): Serialization {
  let { id, attributes, relationships } = res;

  let rels: Multiple<any> = mapValues(
    relationships,
    (rel: RelationshipObj): any =>
      fmapMultiple(rel.data, (relId: ResourceId): any => {
        let relRes = findRelation(relId, relHash);
        return relRes && processResource(relRes, relHash);
      })
  );

  return assign({}, attributes, { id }, rels);
}

function findRelation(
  rel: ResourceId,
  relations: RelationsHash
): Resource | undefined {
  return relations[rel.type] && relations[rel.type][rel.id];
}

// Helper functions

function fmapMultiple<T, R>(
  data: Multiple<T>,
  transform: (data: T) => R
): Multiple<R> {
  // Null Case
  if (!data) {
    return undefined;
    // Array Case
  } else if (isArray(data)) {
    return data.map(transform);
    // Single Case
  } else {
    return transform(data);
  }
}
