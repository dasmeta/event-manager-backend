import { useCallback, useState } from "react";
import { CalculatorOutlined, LoadingOutlined } from "@ant-design/icons"
import translations from "@/assets/translations";
import { eventStatsApi } from "@/services/api";

interface Props {
    refresh: () => {};
    topic: string;
    subscription: string;
}

const CalculateSingleAction: React.FC<Props> = ({ refresh, topic, subscription }) => {
    const [calculating, setCalculating] = useState(false);
    const handleCalculateStats = useCallback(async () => {
        setCalculating(true);
        eventStatsApi.eventStatsCalculateSinglePost({
            topic,
            subscription
        })
        setCalculating(false);
        await refresh();
    }, [topic, subscription]);

    return (
        <>
            <a onClick={handleCalculateStats}>
                {calculating ? <LoadingOutlined /> : <CalculatorOutlined />}
                {" "}
                {translations.calculate}
            </a>
        </>
    );
};

export default CalculateSingleAction;