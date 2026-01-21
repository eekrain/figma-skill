/**
 * Component transformers - simplify component and component set definitions
 */
import type {
  Component,
  ComponentPropertyType,
  ComponentSet,
} from "@figma/rest-api-spec";

export interface ComponentProperties {
  name: string;
  value: string;
  type: ComponentPropertyType;
}

export interface SimplifiedComponentDefinition {
  id: string;
  key: string;
  name: string;
  componentSetId?: string | null;
  description?: string;
}

export interface SimplifiedComponentSetDefinition {
  id: string;
  key: string;
  name: string;
  componentKeys: string[];
}

/**
 * Simplify component definitions
 */
export function simplifyComponents(
  aggregatedComponents: Record<string, Component>
): Record<string, SimplifiedComponentDefinition> {
  return Object.fromEntries(
    Object.entries(aggregatedComponents).map(([id, comp]) => [
      id,
      {
        id,
        key: comp.key,
        name: comp.name,
        componentSetId: comp.componentSetId ?? undefined,
        description: comp.description ?? undefined,
      },
    ])
  );
}

/**
 * Simplify component set definitions
 */
export function simplifyComponentSets(
  aggregatedComponentSets: Record<string, ComponentSet>,
  components?: Record<string, Component>
): Record<string, SimplifiedComponentSetDefinition> {
  return Object.fromEntries(
    Object.entries(aggregatedComponentSets).map(([id, set]) => [
      id,
      {
        id,
        key: set.key,
        name: set.name,
        componentKeys: components
          ? Object.values(components)
              .filter((comp) => comp.componentSetId === id)
              .map((comp) => comp.key)
          : [],
      },
    ])
  );
}
