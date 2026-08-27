import React, { useCallback } from "react";
import { Button } from "antd";
import translations from "@/assets/translations";
import { IconCalculate } from "@/assets/icons";
import { useSseAction } from "@/hooks/useSseAction";

interface Props {
    refresh: () => {};
    topic: string;
    subscription: string;
}

const CalculateSingleAction: React.FC<Props> = ({ refresh, topic, subscription }) => {
    const { run, processing } = useSseAction();
    const handleCalculateStats = useCallback(() => {
        run('/event-stats/calculate-single', {
            topic,
            subscription
        }, { title: translations.actionCalculateSingle })
        .then(() => {
            refresh();
        })
        .catch(() => {});
    }, [topic, subscription, run, refresh]);

    return (
        <Button size="small" onClick={handleCalculateStats} loading={processing}>
            <IconCalculate />
            {translations.calculate}
        </Button>
    );
};

export default CalculateSingleAction;
