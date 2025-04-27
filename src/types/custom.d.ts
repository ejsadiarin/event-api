declare namespace Express {
    interface Request {
        user?: {
            id: number;
            email: string;
        };
    }
}

interface Event {
    id: number;
    title: string;
    description: string;
    venue: string;
    schedule: Date;
    available_slots: number;
    max_capacity: number;
    org_name: string;
    org_logo: string;
}
