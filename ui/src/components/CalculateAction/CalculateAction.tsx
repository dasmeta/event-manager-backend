import { useCallback } from "react";
import { Button } from "antd";
import translations from "@/assets/translations";
import { IconCalculate } from "@/assets/icons";
import { useSseAction } from "@/hooks/useSseAction";

interface Props {
    refresh: () => {}
    showLoader: () => {}
}

const CalculateAction: React.FC<Props> = ({ refresh, showLoader }) => {
    const { run, processing } = useSseAction();
    const handleCalculateStats = useCallback(() => {
        showLoader();
        run('/event-stats/calculate', {}, { title: translations.actionCalculate })
            .catch(() => {})
            .finally(() => {
                refresh();
            });
    }, [run, refresh, showLoader]);

    return (
        <Button
            icon={<IconCalculate />}
            loading={processing}
            onClick={handleCalculateStats}
        >
            {translations.calculate}
        </Button>
    );
};

export default CalculateAction;
