export type Mood = string;

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

/** Entrada no campo de pessoas: usuário real (user_id preenchido) ou texto livre (user_id null) */
export interface PersonEntry {
  name: string;
  user_id: string | null;
}

export interface Memory {
  id: string;
  user_id: string;
  date: string; // ISO date string YYYY-MM-DD
  end_date: string | null; // ISO date string YYYY-MM-DD, null = single day
  text: string;
  mood: Mood | null;
  music: string | null;
  location: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Relations (optional, from joins)
  people?: MemoryPerson[];
  tags?: MemoryTag[];
  music_data?: MemoryMusic;
  photos?: MemoryPhoto[];
  photo_url?: string | null; // signed URL for first photo
}

export interface MemoryMusic {
  id: string;
  memory_id: string;
  title: string;
  artist: string | null;
  created_at: string;
}

export interface MemoryPerson {
  id: string;
  memory_id: string;
  name: string;
  user_id: string | null;
  created_at: string;
}

export interface MemoryTag {
  id: string;
  memory_id: string;
  tag: string;
  created_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_emoji: string | null;
  created_at: string;
}

export interface CollectionMemory {
  id: string;
  collection_id: string;
  memory_id: string;
  added_at: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  my_role?: 'admin' | 'member';
  member_count?: number;
  memory_count?: number;
}

export interface GroupMember {
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export interface GroupMemoryItem {
  id: string;
  memory_id: string;
  added_by: string;
  added_at: string;
  memory: Memory;
  poster_name: string | null;
  poster_avatar: string | null;
}

export interface MemoryPhoto {
  id: string;
  memory_id: string;
  storage_path: string;
  created_at: string;
}

export interface MemoryFormData {
  text: string;
  mood: Mood | null;
  music: string;
  location: string;
  people: PersonEntry[];
  tags: string[];
  is_pinned: boolean;
  end_date: string | null; // YYYY-MM-DD, null = single day
}
