import "./style.css";
import Image from "next/image";
import done from "../../../assets/icons/order/order-done.svg";
import cancelled from "../../../assets/icons/order/order-cancel.svg";
import pending from "../../../assets/icons/order/order-pending.svg";
import confirmed from "../../../assets/icons/order/order-complete.svg";
import calender from "../../../assets/icons/random/calender.svg";
import Link from "next/link";

import { OrderResponse } from "@oms/types/api.type";
import { OrderStatus } from "@oms/types/order.type";

const statusIcon = {
  SHIPPED: pending,
  CONFIRMED: confirmed,
  DELIVERED: done,
  CANCELLED: cancelled,
};

const OrderItem = ({ order, index }: { order: OrderResponse; index: number }) => {
  const getTypeClass = (type: OrderStatus) => {
    switch (type) {
      case "DELIVERED":
        return "success";
      case "CONFIRMED":
        return "confirmed";
      case "CANCELLED":
        return "cancelled";
      default:
        return "pending";
    }
  };

  const VISUAL_ID = order.id.split("-").slice(0, 2).join("-");

  return (
    <Link href={`/order/${order.id}`} className="no-underline">
      <div className="order-item flex sm:flex-row flex-col sm:px-4 px-8 sm:py-8 py-4 justify-between sm:items-center items-start border rounded-xl">
        <div className=" flex items-end gap-6 font-neue">
          <p className="sm:text-xl text-sm text-center flex items-end text-white/50">
            <span className="sm:text-4xl text-2xl text-white/70">[</span> 0{index + 1}{" "}
            <span className="sm:text-4xl text-2xl text-white/70">]</span>
          </p>
          <h1 className="sm:text-3xl text-xl">
            ID - <span className="text-xl">{VISUAL_ID}</span>
          </h1>
        </div>

        <div className="sm:grid flex flex-col items-start grid-cols-4 gap-4 side-info max-sm:mt-2">
          <div className={`badge ${getTypeClass(order.status)}`}>
            {" "}
            <Image
              src={statusIcon[order.status as keyof typeof statusIcon]}
              alt="icon"
              className="inline-block sm:w-8 w-4 mr-2"
            />
            <span>{order.status}</span>
          </div>
          <div className="flex gap-4 col-span-2 ">
            <h3>
              {" "}
              <Image src={calender} alt="icon" className="inline-block sm:w-6 w-4 mr-2" />
              <span>{new Date(order.createdAt).toLocaleDateString()} </span>
            </h3>
            <h3>
              <span> &#x20B9;</span> {order.totalAmount}
            </h3>
            <h3>
              <span>Quantity :</span> {order.totalItems}
            </h3>
          </div>
          <button className="high-btn-bg max-sm:hidden">View Details</button>
        </div>
      </div>
    </Link>
  );
};

export default OrderItem;
