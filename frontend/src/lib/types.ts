export type Quiz = {
  quiz_id: number;
  name: string;
  image: string | null;
  image_url: string | null;
};

export type Team = {
  team_id: number;
  team_name: string;
  quiz_id: number;
  image: string | null;
  image_url: string | null;
};

export type Round = {
  round_id: number;
  round_name: string;
  quiz_id: number;
  maximum_score: number;
};

export type PointUpsertResponse = {
  point_id: number;
  points: number;
  team: Team & { quiz: Quiz };
  round: Round;
};

export type PointRow = {
  point_id: number;
  points: number;
  team: {
    team_id: number;
    team_name: string;
    image: string | null;
    image_url: string | null;
    quiz: { quiz_id: number };
  };
  round: {
    round_id: number;
    round_name: string;
    maximum_score: number;
    quiz: { quiz_id: number };
  };
  quiz: Quiz;
};

