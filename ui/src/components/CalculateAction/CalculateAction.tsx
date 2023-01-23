import { useCallback, useState } from "react";
import { Button } from "antd";
import translations from "@/assets/translations";
import { eventStatsApi } from "@/services/api";
import { IconCalculate } from "@/assets/icons";

interface Props {
    refresh: () => {}
}

const CalculateAction: React.FC<Props> = ({ refresh }) => {
    const [calculating, setCalculating] = useState<boolean>(false);
    const handleCalculateStats = useCallback(async () => {
        setCalculating(true);

        eventStatsApi.eventStatsCalculatePost({});

        setCalculating(false);
        await refresh();
    }, []);

    return (
        <Button
            icon={<IconCalculate />}
            loading={calculating}
            onClick={handleCalculateStats}
        >
            {translations.calculate}
        </Button>
    );
};

export default CalculateAction;