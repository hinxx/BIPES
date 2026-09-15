

from machine import UART

import time

import binascii


def timed_function(f: callable, *args: tuple, **kwargs: dict) -> callable:
    myname = str(f).split(' ')[1]

    def new_func(*args: tuple, **kwargs: dict) -> any:
        t: int = time.ticks_us()
        result = f(*args, **kwargs)
        delta: int = time.ticks_diff(time.ticks_us(), t)
        print('Function {} Time = {:6.3f}ms'.format(myname, delta / 1000))
        return result

    return new_func


class IMU:

    k_acc = 16
    k_temp = 96.38
    c_temp = 36.53
    k_gyro = 2000
    k_angle = 180

    ZAXISCLEARCMD = [0XFF, 0XAA, 0X52]

    ACCCALBCMD = [0XFF, 0XAA, 0X67]

    CONVSLEEPCMD = [0XFF, 0XAA, 0X60]

    UARTMODECMD = [0XFF, 0XAA, 0X61]

    IICMODECMD = [0XFF, 0XAA, 0X62]

    HORIZINSTCMD = [0XFF, 0XAA, 0x65]

    VERTINSTCMD = [0XFF, 0XAA, 0x66]

    BAUD115200CMD = [0XFF, 0XAA, 0X63]

    BAUD9600CMD = [0XFF, 0XAA, 0X64]

    WORK_MODE, SLEEP_MODE = (1, 0)

    UART_MODE, IIC_MODE = (1, 0)

    HORIZ_INST, VERT_INST = (1, 0)

    def __init__(self, UART_Obj: UART) -> None:

        self.UART_Obj: UART = UART_Obj

        self.acc_x: float = 0
        self.acc_y: float = 0
        self.acc_z: float = 0

        self.temp: float = 0

        self.gyro_x: float = 0
        self.gyro_y: float = 0
        self.gyro_z: float = 0

        self.angle_x: float = 0
        self.angle_y: float = 0
        self.angle_z: float = 0

        self.checksum: int = 0

        self.datalist: list[int] = [0] * 15

        self.rcvcount: int = 0

        self.recv_acc_flag: int = 0

        self.recv_gyro_flag: int = 0

        self.recv_angle_flag: int = 0

        self.workmode: int = IMU.WORK_MODE

        self.transmode: int = IMU.UART_MODE

        self.instmode: int = IMU.HORIZ_INST

        self.SendCMD(IMU.ZAXISCLEARCMD)

        self.SendCMD(IMU.ACCCALBCMD)

    def __CalChecksum(self) -> bool:

        self.checksum = self.datalist[10]

        tempchecksum: int = 0

        for i in range(0, 10):
            tempchecksum = tempchecksum + self.datalist[i]

        tempchecksum = tempchecksum & 0xff

        if tempchecksum != self.checksum:
            return False
        else:
            return True

    def SendCMD(self, cmd: list[int]) -> bool:

        if (cmd != IMU.ZAXISCLEARCMD
            and cmd != IMU.ACCCALBCMD
            and cmd != IMU.CONVSLEEPCMD
            and cmd != IMU.UARTMODECMD
            and cmd != IMU.IICMODECMD
            and cmd != IMU.HORIZINSTCMD
            and cmd != IMU.VERTINSTCMD
            and cmd != IMU.BAUD115200CMD
                and cmd != IMU.BAUD9600CMD):

            return False

        for data in cmd:

            self.UART_Obj.write(bytes([data]))

        if cmd == IMU.CONVSLEEPCMD:

            if self.workmode == IMU.WORK_MODE:
                self.workmode = IMU.SLEEP_MODE
            else:
                self.workmode = IMU.WORK_MODE

        if cmd == IMU.UARTMODECMD:

            self.transmode = IMU.UART_MODE

        if cmd == IMU.IICMODECMD:

            self.transmode = IMU.IIC_MODE

        if cmd == IMU.HORIZINSTCMD:

            self.instmode = IMU.HORIZ_INST

        if cmd == IMU.VERTINSTCMD:

            self.instmode = IMU.VERT_INST

        if cmd == IMU.BAUD115200CMD:

            self.UART_Obj.init(baudrate=115200)

        if cmd == IMU.BAUD9600CMD:

            self.UART_Obj.init(baudrate=9600)

        if cmd == IMU.ZAXISCLEARCMD or cmd == IMU.ACCCALBCMD:

            time.sleep_ms(500)

        return True

    @timed_function
    def RecvData(self) -> tuple[float, float, float]:

        while True:

            if self.UART_Obj.any():

                tempdata = self.UART_Obj.read(1)

                tempdata = binascii.hexlify(tempdata)

                tempdata = int(tempdata, 16)

                self.datalist[self.rcvcount] = tempdata

                if self.datalist[0] != 0x55:

                    self.rcvcount = 0

                else:

                    self.rcvcount = self.rcvcount + 1

                    if self.rcvcount < 11:
                        continue

                    else:

                        if self.__CalChecksum():

                            if self.datalist[1] == 0x51:

                                self.acc_x = (
                                    self.datalist[3] << 8 | self.datalist[2]) / 32768 * IMU.k_acc
                                self.acc_y = (
                                    self.datalist[5] << 8 | self.datalist[4]) / 32768 * IMU.k_acc
                                self.acc_z = (
                                    self.datalist[7] << 8 | self.datalist[6]) / 32768 * IMU.k_acc
                                self.temp = (
                                    self.datalist[9] << 8 | self.datalist[8]) / 32768 * IMU.k_temp + IMU.c_temp

                                self.recv_acc_flag = 1

                            if self.datalist[1] == 0x52:

                                self.gyro_x = (
                                    self.datalist[3] << 8 | self.datalist[2]) / 32768 * IMU.k_gyro
                                self.gyro_y = (
                                    self.datalist[5] << 8 | self.datalist[4]) / 32768 * IMU.k_gyro
                                self.gyro_z = (
                                    self.datalist[7] << 8 | self.datalist[6]) / 32768 * IMU.k_gyro

                                self.recv_gyro_flag = 1

                            if self.datalist[1] == 0x53:

                                self.angle_x = (
                                    self.datalist[3] << 8 | self.datalist[2]) / 32768 * IMU.k_angle
                                self.angle_y = (
                                    self.datalist[5] << 8 | self.datalist[4]) / 32768 * IMU.k_angle
                                self.angle_z = (
                                    self.datalist[7] << 8 | self.datalist[6]) / 32768 * IMU.k_angle

                                self.recv_angle_flag = 1

                            if self.recv_acc_flag == 1 and self.recv_gyro_flag == 1 and self.recv_angle_flag == 1:

                                self.recv_acc_flag = 0
                                self.recv_gyro_flag = 0
                                self.recv_angle_flag = 0

                                return self.acc_x, self.acc_y, self.acc_z, self.temp, self.gyro_x, self.gyro_y, self.gyro_z, self.angle_x, self.angle_y, self.angle_z

                        self.rcvcount = 0
