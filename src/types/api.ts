export interface GoogleBookVolumeInfo {
  title: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
  };
  industryIdentifiers?: {
    type: string;
    identifier: string;
  }[];
  pageCount?: number;
}

export interface GoogleBookItem {
  id: string;
  volumeInfo: GoogleBookVolumeInfo;
}

export interface GoogleBooksApiResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBookItem[];
}
