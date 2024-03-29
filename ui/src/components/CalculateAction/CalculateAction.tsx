import { useCallback, useState } from "react";
import { Button, message } from "antd";
import translations from "@/assets/translations";
import { eventStatsApi } from "@/services/api";
import { IconCalculate } from "@/assets/icons";

interface Props {
    refresh: () => {}
    showLoader: () => {}
}

const CalculateAction: React.FC<Props> = ({ refresh, showLoader }) => {
    const [calculating, setCalculating] = useState<boolean>(false);
    const handleCalculateStats = useCallback(() => {
        setCalculating(true);
        showLoader();

        eventStatsApi.eventStatsCalculatePost({})
            .then(() => {
                refresh();
                setCalculating(false);
            })
            .catch(() => {
                message.error(translations.somethingWentWrong)
                setCalculating(false);
            });
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