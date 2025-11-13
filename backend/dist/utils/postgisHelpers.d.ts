export declare function parsePostGISPoint(pointString: string | null | undefined): {
    latitude: number;
    longitude: number;
} | null;
export declare function formatPostGISPoint(latitude: number, longitude: number): string;
export declare function postGISPointToGeoJSON(pointString: string | null | undefined): {
    type: 'Point';
    coordinates: [number, number];
} | null;
//# sourceMappingURL=postgisHelpers.d.ts.map