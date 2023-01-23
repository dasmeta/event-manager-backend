import { useCallback, useState } from "react";
import { Button } from "antd";
import { CalculatorOutlined, LoadingOutlined } from "@ant-design/icons"
import translations from "@/assets/translations";
import { eventStatsApi } from "@/services/api";
import { IconCalculate } from "@/assets/icons";
import styles from "./CalculateSingleAction.less";

interface Props {
    refresh: () => {};
    topic: string;
    subscription: string;
}

const CalculateSingleAction: React.FC<Props> = ({ refresh, topic, subscription }) => {
    // const [calculating, setCalculating] = useState(false);
    const handleCalculateStats = useCallback(async () => {
        // setCalculating(true);
        eventStatsApi.eventStatsCalculateSinglePost({
            topic,
            subscription
        })
        // setCalculating(false);
        await refresh();
    }, [topic, subscription]);

    return (
        <Button size="small" onClick={handleCalculateStats}>
            <span className={styles.iconCalculation}><IconCalculate /></span>
            {translations.calculate}
        </Button>
    );
};

export default CalculateSingleAction;