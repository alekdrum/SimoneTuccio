export type Post = {
  id: number;
  slug: string;
  title: string;
  content: string;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type Social = {
  id: number;
  platform: string;
  label: string;
  url: string;
  position: number;
  visible: boolean;
};

export type ArchiveItem = {
  id: number;
  title: string;
  description: string | null;
  kind: 'audio' | 'image' | 'document' | 'video' | 'other';
  url: string;
  filename: string;
  size_bytes: number | null;
  content_type: string | null;
  position: number;
  visible: boolean;
  downloads: number;
  created_at: string;
};

export type Settings = Record<string, string>;
