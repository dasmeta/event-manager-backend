import { useState, useCallback } from "react";
import { Button } from "antd";
import { DeleteOutlined, LoadingOutlined } from "@ant-design/icons";
import translations from "@/assets/translations";
import { eventSubscriptionApi } from "@/services/api";

interface Props {
    item: any;
    refresh: () => {}
}

const CleanAnomalyAction: React.FC<Props> = ({ item, refresh }) => {
    const [processing, setProcessing] = useState(false);
    const handleCleanAnomaly = useCallback(() => {
        setProcessing(true);
        eventSubscriptionApi.eventSubscriptionsCleanAnomalyPost({ 
            topic: item.topic,
            subscription: item.subscription 
        }).then(() => {
            setProcessing(false);
            refresh();
        });
    }, [item]);

    return (
        <Button size="small" onClick={handleCleanAnomaly}>
            {processing ? <LoadingOutlined /> : <DeleteOutlined />}
            {" "}
            {translations.cleanAnomaly}
        </Button>
    );
};

export default CleanAnomalyAction;