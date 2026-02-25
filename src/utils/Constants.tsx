import { Bike, Building, Building2, Car, Dumbbell, Home, Layers, Shield, Sparkles, Store, Wifi, Zap } from "lucide-react-native";

export const CURRENCY = '₹';

export const PROPERTY_TYPES = [
    { id: 'house', label: 'House', icon: Home },
    { id: 'building', label: 'Building', icon: Building },
    { id: 'pg', label: 'PG', icon: Building2 },
    { id: 'shop', label: 'Shop', icon: Store },
    { id: 'flat', label: 'Flat', icon: Layers },
];

export const AMENITIES = [
    { id: 'wifi', label: 'WIFI', icon: Wifi },
    { id: 'car_parking', label: 'CAR\nPARKING', icon: Car },
    { id: 'bike_parking', label: 'BIKE\nPARKING', icon: Bike },
    { id: 'gated_security', label: 'GATED\nSECURITY', icon: Shield },
    { id: 'cctv', label: 'CCTV', icon: Shield },
    { id: 'lift', label: 'LIFT', icon: Zap },
    { id: 'house_cleaning', label: 'HOUSE\nCLEANING', icon: Sparkles },
    { id: 'gym', label: 'GYM', icon: Dumbbell },
];

export const RENT_PAYMENT_TYPES = [
    { id: 'previous_month', label: 'Previous Month (Post-paid)' },
    { id: 'current_month', label: 'Current Month (Pre-paid)' },
];

export const RENT_CYCLE_OPTIONS = [
    { id: 'first_of_month', label: '1st of the month', description: 'Bill generated on 1st of every month' },
    { id: 'relative', label: 'Relative Date', description: "Based on tenant's move-in date" },
];

export const METER_TYPES = ['Metered', 'Fixed', 'Free'];

export const ROOM_TYPES = [
    '1 BHK', '2 BHK', '3 BHK', '1 RK', 'Studio', 'Penthouse', 'Office', 'Shop', 'Godown', 'Other'
];

export const LEASE_TYPES = [
    { id: 'monthly', label: 'Until tenant leaves' },
    { id: 'fixed', label: 'Fixed' }
];

export const LEASE_PERIOD_UNITS = [
    { id: 'days', label: 'Days' },
    { id: 'months', label: 'Months' },
    { id: 'years', label: 'Years' }
];

export const FURNISHING_TYPES = [
    { id: 'none', label: 'None' },
    { id: 'semi', label: 'Semi' },
    { id: 'full', label: 'Full' },
];

export const TITLES = [
    { id: 'Mr.', label: 'Mr.' },
    { id: 'Ms.', label: 'Ms.' },
    { id: 'Mrs.', label: 'Mrs.' },
];

export const PROFESSIONS = [
    'Software Engineer', 'Doctor', 'Teacher', 'Businessman', 'Student', 'Banking', 'Government Job', 'Freelancer', 'Other'
];

export const GUEST_COUNTS = [
    '1 Person', '2 People', '3 People', '4 People', '5+ People'
];

export const OTA_VERSION = 4;