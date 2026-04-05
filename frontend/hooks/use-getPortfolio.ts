"use client";
import api from "@/lib/axios";
import axios from "axios";
import { useState, useEffect } from "react";
// This hook is responsible for fetching portfolio data from the backend and providing it to components that need it. It abstracts away the details of the API call and state management, making it easier for components to access portfolio data without worrying about how it's fetched or stored.

export default function useGetPortfolio() {
    const [portfolio, setPortfolio] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPortfolio = async () => {
            try {
                const response = await api.get("/api/portfolio/portfolio")
                setPortfolio(response.data);
            } catch (error) {
                setError(error instanceof axios.AxiosError ? error.message : "An unexpected error occurred");
            }
        }

        fetchPortfolio();

        // Cleanup function to reset state when the component unmounts
        return () => {
            setPortfolio(null);
            setError(null);
        };
    }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

    return { portfolio, error };
}