import { useState, useCallback } from "react";
import { DeleteOutlined, LoadingOutlined } from "@ant-design/icons";
import translations from "@/assets/translations";
import { eventSubscriptionApi } from "@/services/api";

interface Props {
    item: any;
    refresh: () => {};
}

const FixMissingAction: React.FC<Props> = ({ item, refresh }) => {
    const [processing, setProcessing] = useState(false);
    const handleCleanAnomaly = useCallback(() => {

        if(!processing) {
            setProcessing(true);
            eventSubscriptionApi.eventSubscriptionsMarkMissingAsErrorPost({
                topic: item.topic,
                subscription: item.subscription
            }).then(() => {
                setProcessing(false);
                refresh();
            });
        }
    }, [item]);

    return (
        <>
            <a onClick={handleCleanAnomaly}>
                {processing ? <LoadingOutlined /> : <DeleteOutlined />}
                {" "}
                {translations.fixMissing}
            </a>
        </>
    );
};

export default FixMissingAction;