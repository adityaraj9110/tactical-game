export interface RectObstacle {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    isCrate?: boolean;
    hp?: number;
}
export interface MapData {
    id: string;
    name: string;
    width: number;
    height: number;
    spawnsTeamA: {
        x: number;
        y: number;
    }[];
    spawnsTeamB: {
        x: number;
        y: number;
    }[];
    walls: RectObstacle[];
    crates: RectObstacle[];
}
export declare const WAREHOUSE_MAP: MapData;
//# sourceMappingURL=warehouse.d.ts.map