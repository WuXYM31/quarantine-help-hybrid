import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { GeoLocationService } from 'src/app/services/geo-location/geo-location.service';
import { MiscService } from 'src/app/services/misc/misc.service';
import { HEREMapService } from 'src/app/services/HERE-map/here-map.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import { LatLng } from '../../models/geo';
import { ReverseGeoResult } from 'src/app/models/here-map';
import { UserRegData, UserRegResponse } from 'src/app/models/auth';
import { UserType } from 'src/app/models/core-api';
import { Crisis } from 'src/app/constants/core-api';

type userSegments = 'volunteer' | 'quarantined';
interface UserAddress {
  address: string;
  city: string;
  country: string;
  countryCode: string;
  postCode: string;
  placeId: string;
}
@Component({
  selector: 'app-user-registration',
  templateUrl: './user-registration.page.html',
  styleUrls: ['./user-registration.page.scss'],
})
export class UserRegistrationPage implements OnInit, OnDestroy {
  userSegment: userSegments;
  volRegForm: FormGroup;
  quaRegForm: FormGroup;
  volRegFormSubs: Subscription;
  quaRegFormSubs: Subscription;
  volFormClean: boolean; // Flag to check if no changes were made.
  quaFormClean: boolean;
  showPasswordText: boolean; // To toggle password visibility
  passwordIcon: 'eye' | 'eye-off' = 'eye';
  toastElement: Promise<void>;
  loadingAniGPSData: HTMLIonLoadingElement;
  loadingAniGetAddr: HTMLIonLoadingElement;
  currentLocation: LatLng = undefined;
  userAddress: UserAddress;
  userRegAni: HTMLIonLoadingElement;

  constructor(
    private geoLocationService: GeoLocationService,
    private miscService: MiscService,
    private hereMapService: HEREMapService,
    private router: Router,
    private authService: AuthService
  ) {
    this.volRegForm = new FormGroup({
      firstName: new FormControl('', [Validators.required]),
      lastName: new FormControl('', [Validators.required]),
      email: new FormControl('', [
        Validators.required,
        Validators.minLength(4),
        Validators.email,
      ]),
      phoneNumber: new FormControl('', [
        Validators.minLength(8),
        Validators.maxLength(16),
        Validators.required,
      ]),
      password: new FormControl('', [
        Validators.minLength(8),
        Validators.maxLength(30),
        Validators.required,
      ]),
    });
    this.quaRegForm = new FormGroup({
      firstName: new FormControl('', [Validators.required]),
      lastName: new FormControl('', [Validators.required]),
      address1: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
      ]),
      address2: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
      ]),
      city: new FormControl('', [Validators.required, Validators.minLength(2)]),
      postCode: new FormControl('', [Validators.required]),
      country: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
      ]),
      email: new FormControl('', [
        Validators.required,
        Validators.minLength(4),
        Validators.email,
      ]),
      phoneNumber: new FormControl('', [
        Validators.minLength(8),
        Validators.maxLength(16),
        Validators.required,
      ]),
      password: new FormControl('', [
        Validators.minLength(8),
        Validators.maxLength(30),
        Validators.required,
      ]),
    });
  }

  ngOnInit() {
    this.showPasswordText = false;
    this.userSegment = 'volunteer';
    this.userAddress = undefined;
    this.volRegFormSubs = this.volRegForm.valueChanges.subscribe((change) => {
      this.volFormClean = false;
    });
    this.quaRegFormSubs = this.quaRegForm.valueChanges.subscribe((change) => {
      this.quaFormClean = false;
    });

    // Provide user with instructions on filling the form.
    this.miscService.presentAlert({
      header: 'Info',
      subHeader: 'Registration Options',
      buttons: ['Ok'],
      message: `Please select <strong>I'm Quarantined</strong> if you are in quarantine and require assistance from volunteers.
      <br><br>You may continue in the <strong>I Volunteer</strong> tab otherwise.`,
    });
  }

  ngOnDestroy() {
    this.volRegFormSubs.unsubscribe();
    this.quaRegFormSubs.unsubscribe();
  }

  togglePasswordVisibility() {
    this.passwordIcon = this.passwordIcon === 'eye-off' ? 'eye' : 'eye-off';
    if (this.passwordIcon === 'eye-off') {
      setTimeout(() => {
        this.passwordIcon = 'eye';
      }, 10000);
    }
  }

  onSegmentChange() {
    if (this.userSegment === 'quarantined') {
      // Start the loading animation for getting GPS data
      this.miscService
        .presentLoadingWithOptions({
          duration: 0,
          message: `Getting current location.`,
        })
        .then((onLoadSuccess) => {
          this.loadingAniGPSData = onLoadSuccess;
          // Get the GPS data
          this.getGPSLocation();
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }

  getGPSLocation() {
    // If GPS data already exists, use it.
    if (this.currentLocation) {
      this.getUserAddress();
    } else {
      this.loadingAniGPSData.present();
      this.geoLocationService
        .getCurrentPosition()
        .then((location) => {
          // Destroy loading controller on dismiss
          if (this.loadingAniGPSData !== undefined) {
            this.loadingAniGPSData.dismiss().then(() => {
              this.loadingAniGPSData = undefined;
            });
          }
          this.currentLocation = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
          this.getUserAddress();
        })
        .catch((error) => {
          console.error(`ERROR - Unable to getting location`, error);
          // Destroy loading controller on dismiss and ask for a retry
          if (this.loadingAniGPSData) {
            this.loadingAniGPSData.dismiss().then(() => {
              this.loadingAniGPSData = undefined;
            });
          }
          // Show error message and retry option on GPS fail
          this.miscService
            .presentToastWithOptions({
              message: error.message,
              color: 'secondary',
            })
            .then((toast) => {
              this.toastElement = toast.present();
              toast.onWillDismiss().then((OverlayEventDetail) => {
                if (OverlayEventDetail.role === 'cancel') {
                  // this.exitApp();
                } else {
                  this.getGPSLocation();
                }
              });
            });
        });
    }
  }

  getUserAddress() {
    // call reverse-geo code iff the user address does not exist
    if (this.userAddress) {
      this.quaRegForm.get('address1').setValue(this.userAddress.address);
      this.quaRegForm.get('city').setValue(this.userAddress.city);
      this.quaRegForm.get('country').setValue(this.userAddress.country);
    } else {
      this.miscService
        .presentLoadingWithOptions({
          duration: 0,
          message: `Getting user address`,
        })
        .then((onLoadSuccess) => {
          this.loadingAniGetAddr = onLoadSuccess;
          this.loadingAniGetAddr.present();
          // Get the user address
          this.hereMapService
            .getUserAddress(this.currentLocation)
            .then((data: ReverseGeoResult) => {
              // Destroy loading controller on dismiss
              if (this.loadingAniGetAddr !== undefined) {
                this.loadingAniGetAddr.dismiss().then(() => {
                  this.loadingAniGetAddr = undefined;
                });
              }
              const geoDataObj = data.body.Response.View[0].Result[0].Location;
              this.userAddress = {
                address: geoDataObj.Address.Label,
                city: geoDataObj.Address.City,
                countryCode: geoDataObj.Address.AdditionalData[0].value,
                country: geoDataObj.Address.AdditionalData[1].value,
                postCode: geoDataObj.Address.PostalCode,
                placeId: geoDataObj.LocationId,
              };
              // set the values to the form
              this.quaRegForm
                .get('address1')
                .setValue(this.userAddress.address);
              this.quaRegForm.get('city').setValue(this.userAddress.city);
              this.quaRegForm.get('country').setValue(this.userAddress.country);
              this.quaRegForm
                .get('postCode')
                .setValue(this.userAddress.postCode);
            });
        })
        .catch((error) => {
          console.error('Error getting address', error);
          // Destroy loading controller on dismiss.
          if (this.loadingAniGetAddr) {
            this.loadingAniGetAddr.dismiss().then(() => {
              this.loadingAniGetAddr = undefined;
            });
          }
        });
    }
  }

  registerUser(userType: UserType) {
    const userData: UserRegData = {
      user: undefined,
      type: undefined,
      phone: undefined,
      placeId: undefined,
      postCode: undefined,
      city: undefined,
      country: undefined,
      position: undefined,
      firstLineOfAddress: undefined,
      secondLineOfAddress: '',
      crisis: Crisis.COVID19,
    };

    if (userType === 'AF') {
      userData.user = {
        firstName: this.quaRegForm.get('firstName').value,
        lastName: this.quaRegForm.get('lastName').value,
        email: this.quaRegForm.get('email').value,
        password: this.quaRegForm.get('password').value,
      };
      userData.city = this.quaRegForm.get('city').value;
      userData.postCode = this.quaRegForm.get('postCode').value;
      userData.firstLineOfAddress = this.quaRegForm.get('address1').value;
      userData.secondLineOfAddress = this.quaRegForm.get('address2').value;
      userData.phone = this.quaRegForm.get('phoneNumber').value;
      userData.position = {
        latitude: this.currentLocation.lat as any,
        longitude: this.currentLocation.lng as any,
      };
      userData.type = userType;
      userData.placeId = this.userAddress.placeId;
      // TODO : Generate 2 char short-code from user Input/make it a select dropdown ?
      userData.country = this.userAddress.countryCode;
      // userData.country = this.quaRegForm.get('country').value;
    } else if (userType === 'HL') {
      userData.type = userType;
      userData.user = {
        firstName: this.volRegForm.get('firstName').value,
        lastName: this.volRegForm.get('lastName').value,
        email: this.volRegForm.get('email').value,
        password: this.volRegForm.get('password').value,
      };
      userData.phone = this.volRegForm.get('phoneNumber').value;
    }

    // start the loading animation
    this.miscService
      .presentLoadingWithOptions({
        duration: 0,
        message: `Registering user`,
      })
      .then((onLoadSuccess) => {
        this.userRegAni = onLoadSuccess;
        this.userRegAni.present();

        // call the register API
        this.authService
          .registerUser(userData)
          .then((response: UserRegResponse) => {
            this.userRegAni.dismiss();
            this.router.navigate(['/login']);
          })
          .catch((errorObj) => {
            this.userRegAni.dismiss();
            const { error, status: statusCode } = errorObj;
            const errorMessages: string[] = [];
            for (const key in error) {
              if (error.hasOwnProperty(key) && typeof key !== 'function') {
                console.error(error[key][0]);
                errorMessages.push(error[key][0]);
              }
            }
            // show the errors as alert
            this.handleLoginErrors(errorMessages, statusCode);
          });
      })
      .catch((error) => console.error(error));
  }

  handleLoginErrors(errorMessages: string[], statusCode) {
    console.log(...errorMessages, statusCode);
    this.miscService.presentAlert({ message: errorMessages.join('. ') });
  }
}
