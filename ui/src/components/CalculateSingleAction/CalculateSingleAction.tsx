import React, { useCallback, useState } from "react";
import { Button, message } from "antd";
import translations from "@/assets/translations";
import { eventStatsApi } from "@/services/api";
import { IconCalculate } from "@/assets/icons";

interface Props {
    refresh: () => {};
    topic: string;
    subscription: string;
}

const CalculateSingleAction: React.FC<Props> = ({ refresh, topic, subscription }) => {
    const [calculating, setCalculating] = useState(false);
    const handleCalculateStats = useCallback(() => {
        setCalculating(true);
        eventStatsApi.eventStatsCalculateSinglePost({
            topic,
            subscription
        })
        .then(() => {
            refresh();
            setCalculating(false);
        })
        .catch(() => {
            message.error(translations.somethingWentWrong);
            setCalculating(false);
        })
    }, [topic, subscription]);

    return (
        <Button size="small" onClick={handleCalculateStats} loading={calculating}>
            <IconCalculate />
            {translations.calculate}
        </Button>
    );
};

export default CalculateSingleAction;