import { useState, useCallback } from "react";
import { DatePicker, Popover, Button } from "antd";
import { eventSubscriptionApi } from "@/services/api";

const { RangePicker } = DatePicker;

interface Props {
    item: any;
    refresh: () => {};
}

const MarkAsFail: React.FC<Props> = ({ item, refresh }) => {
    const [range, setRange] = useState([]);
    const [processing, setProcessing] = useState(false);
    const handleMarkAsFail = useCallback(() => {
        setProcessing(true);
        eventSubscriptionApi.eventSubscriptionsMarkAsFailPost({
            topic: item.topic,
            subscription: item.subscription,
            start: range[0].toDate(),
            end: range[1].toDate(),
        }).then(() => {
            setProcessing(false);
            refresh();
        });
    }, [item, range]);

    return (
        <Popover
            trigger="click"
            title="Mark As Fail"
            placement="leftBottom"
            content={
                <div>
                    <RangePicker
                        placeholder={["Start Time ", "End Time"]}
                        value={range}
                        onChange={value => setRange(value)}
                    />

                    <br />
                    <br />

                    <Button type="primary" loading={processing} onClick={handleMarkAsFail} disabled={!range.length}>
                        Process
                    </Button>
                </div>
            }
        >
            <a>Mark As Fail</a>
        </Popover>
    );
};

export default MarkAsFail;