declare interface Event {
    id: number;
    title: string;
    description: string;
    org_id: number;
    venue: string;
    schedule: Date;
    is_free: boolean;
    code?: string;
    registered_count: number;
    max_capacity: number;
}

declare interface Registration {
    user_id: number;
    event_id: number;
    pwd_type?: 'TEXTLESS_VERTICAL' | 'TEXTLESS_HORIZONTAL' | 'WAIN';
    pwd_data?: string;
}
