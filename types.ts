
export interface Tool {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  usageInstructions?: string;
  blocks?: { title: string; detail: string }[];
  source?: string;
  additionalResources?: { label: string; url: string }[];
  templateUrl?: string;
  exampleImage?: string;
}

export interface JourneyCategory {
  id: string;
  title: string;
  image: string;
  tools: Tool[];
}

export interface InnovationUpdate {
  id: string;
  title: string;
  description: string;
  image: string;
}

export interface Comment {
  id: string;
  authorName: string;
  authorAvatar: string;
  commentText: string;
  createdAt: string;
}

export interface Post {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  comments: Comment[];
}

export enum AppView {
  TOOLS = 'tools',
  UPDATES = 'updates',
  TOOL_DETAIL = 'tool_detail'
}
