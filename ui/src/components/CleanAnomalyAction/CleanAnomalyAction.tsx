import { useCallback } from "react";
import { Button } from "antd";
import { DeleteOutlined, LoadingOutlined } from "@ant-design/icons";
import translations from "@/assets/translations";
import { useSseAction } from "@/hooks/useSseAction";

interface Props {
    item: any;
    refresh: () => {}
}

const CleanAnomalyAction: React.FC<Props> = ({ item, refresh }) => {
    const { run, processing } = useSseAction();
    const handleCleanAnomaly = useCallback(() => {
        run('/event-subscriptions/clean-anomaly', { 
            topic: item.topic,
            subscription: item.subscription 
        }, { title: translations.actionCleanAnomaly }).then(() => {
            refresh();
        }).catch(() => {});
    }, [item, run, refresh]);

    return (
        <Button size="small" onClick={handleCleanAnomaly}>
            {processing ? <LoadingOutlined /> : <DeleteOutlined />}
            {" "}
            {translations.cleanAnomaly}
        </Button>
    );
};

export default CleanAnomalyAction;
