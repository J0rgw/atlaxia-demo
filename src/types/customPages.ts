export type CustomPageId = `custom-${string}`;

export interface CustomPageDefinition {
  id: CustomPageId;
  name: string;
  icon: string;
  slug: string;
  createdAt: string;
  enabled: boolean;
  order: number;
}

export interface CustomPageWidgetLayout {
  id: string;
  size: 'full' | 'half';
}

export interface CustomPageState {
  definition: CustomPageDefinition;
  widgets: CustomPageWidgetLayout[];
}
