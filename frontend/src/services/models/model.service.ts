export interface LocalModel {
  id: string;
  name: string;
  size: number;
}

export class ModelService {
  async getModels(): Promise<LocalModel[]> {
    const response = await fetch("/api/models");

    if (!response.ok) {
      throw new Error("Failed to fetch models.");
    }

    const data = await response.json();

    return data.models;
  }
}

export const modelService = new ModelService();