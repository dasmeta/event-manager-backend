import { useCallback, useState } from "react";
import { Button } from "antd";
import { CalculatorOutlined } from "@ant-design/icons";
// import IconCalculate from "./images/icons/IconCalculate.svg";
import translations from "@/assets/translations";
import { eventStatsApi } from "@/services/api";

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
        <Button icon={<CalculatorOutlined />} loading={calculating} onClick={handleCalculateStats}>
            {translations.calculate}
        </Button>
    );
};

export default CalculateAction;